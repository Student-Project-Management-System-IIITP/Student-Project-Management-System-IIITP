#!/usr/bin/env node

const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  credentials: {
    email: process.env.API_EMAIL,
    password: process.env.API_PASSWORD
  },
  timeoutMs: parseInt(process.env.API_TIMEOUT || '15000', 10)
};

const args = process.argv.slice(2);
const options = {
  endpoint: '/admin/dashboard',
  method: 'GET',
  iterations: 20,
  warmupIterations: 3,
  skipAuth: false,
  body: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-h' || arg === '--help') {
    console.log(`
Usage: node benchmark.js [endpoint] [options]

Environment Variables:
  API_URL      Base URL (default: http://localhost:3000)
  API_EMAIL    Email for authentication
  API_PASSWORD Password for authentication
  API_TIMEOUT  Request timeout in ms (default: 15000)

Arguments:
  [endpoint]   API endpoint (default: /admin/dashboard)

Options:
  -u, --username <email>     Email for authentication
  -p, --password <pwd>       Password for authentication
  -m, --method <method>      HTTP method (GET, POST, PUT, DELETE) (default: GET)
  -i, --iterations <n>       Number of benchmark runs (default: 20)
  -w, --warmup <n>           Number of warmup runs (default: 3)
  -d, --data <json>          JSON string body for requests
  --no-auth                  Skip authentication
  -h, --help                 Show this help menu
    `);
    process.exit(0);
  } else if (arg === '-u' || arg === '--username') {
    CONFIG.credentials.email = args[++i];
  } else if (arg === '-p' || arg === '--password') {
    CONFIG.credentials.password = args[++i];
  } else if (arg === '-m' || arg === '--method') {
    options.method = args[++i].toUpperCase();
  } else if (arg === '-i' || arg === '--iterations') {
    options.iterations = parseInt(args[++i], 10);
  } else if (arg === '-w' || arg === '--warmup') {
    options.warmupIterations = parseInt(args[++i], 10);
  } else if (arg === '-d' || arg === '--data') {
    options.body = args[++i];
  } else if (arg === '--no-auth') {
    options.skipAuth = true;
  } else if (!arg.startsWith('-') && i === 0) {
    options.endpoint = arg.startsWith('/') ? arg : `/${arg}`;
  }
}

const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m'
};

const format = {
  bold: (t) => `${colors.bold}${t}${colors.reset}`,
  success: (t) => `${colors.green}✓ ${t}${colors.reset}`,
  error: (t) => `${colors.red}✖ ${t}${colors.reset}`,
  warn: (t) => `${colors.yellow}⚠ ${t}${colors.reset}`,
  dim: (t) => `${colors.dim}${t}${colors.reset}`,
  ms: (v) => `${colors.cyan}${v.toFixed(2)}ms${colors.reset}`
};

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = null;
  }

  async authenticate(email, password) {
    if (!email || !password) {
      throw new Error('Authentication required. Provide credentials via -u and -p flags, or use API_EMAIL and API_PASSWORD env vars. Use --no-auth to skip.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(`Auth failed: ${data.message || response.statusText}`);
      }
      
      this.token = data.data.token;
      return data.data.user;
    } catch (error) {
      if (error.cause && error.cause.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to ${this.baseUrl}`);
      }
      throw error;
    }
  }

  async measureRequest(path, method = 'GET', body = null) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const fetchOptions = { method, headers, signal: controller.signal };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const start = performance.now();
    
    try {
      const response = await fetch(url, fetchOptions);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      const duration = performance.now() - start;
      
      return {
        success: response.ok,
        statusCode: response.status,
        clientTime: duration,
        serverTime: data?.responseTime || null,
        error: response.ok ? null : (data?.message || response.statusText || 'Error')
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        clientTime: performance.now() - start,
        serverTime: null,
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

class Statistics {
  static calculate(samples) {
    if (!samples?.length) return null;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const stdDev = Math.sqrt(sorted.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / sorted.length);

    const p = (pct) => sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)] || 0;

    return { min: sorted[0], max: sorted[sorted.length - 1], mean, stdDev, p50: p(50), p95: p(95), p99: p(99) };
  }
}

async function run() {
  const client = new ApiClient(CONFIG.apiUrl);

  if (!options.skipAuth) {
    try {
      const user = await client.authenticate(CONFIG.credentials.email, CONFIG.credentials.password);
      console.log(format.success(`Authenticated as ${user.role} (${user.email})`));
    } catch (error) {
      console.error(format.error(error.message));
      process.exit(1);
    }
  }

  if (options.warmupIterations > 0) {
    for (let i = 0; i < options.warmupIterations; i++) {
      const result = await client.measureRequest(options.endpoint, options.method, options.body);
      if (!result.success) {
        console.error(`\n${format.error(`Warmup failed: HTTP ${result.statusCode} - ${result.error}`)}`);
        process.exit(1);
      }
      process.stdout.write(format.dim('.'));
    }
    console.log(`\n${format.success('Warmup complete')}`);
  }

  console.log(`\nBenchmarking ${format.bold(`${options.method} ${options.endpoint}`)} (${options.iterations} runs)`);
  const results = [];
  
  for (let i = 0; i < options.iterations; i++) {
    process.stdout.write(`\r${format.dim(`Run ${i + 1}/${options.iterations}`)}`);
    results.push(await client.measureRequest(options.endpoint, options.method, options.body));
  }
  console.log(`\r${format.success(`Completed ${options.iterations} runs                 `)}`);

  const successes = results.filter(r => r.success);
  if (!successes.length) {
    console.error(`\n${format.error('All requests failed.')}`);
    if (results.length) console.error(format.dim(`Last Error: HTTP ${results[0].statusCode} - ${results[0].error}`));
    process.exit(1);
  }

  const clientStats = Statistics.calculate(successes.map(r => r.clientTime));
  const serverStats = Statistics.calculate(successes.map(r => r.serverTime).filter(Boolean));

  console.log(`\n${format.bold('Client Latency (Roundtrip)')}`);
  console.log(`  Min:  ${format.ms(clientStats.min)}`);
  console.log(`  Max:  ${format.ms(clientStats.max)}`);
  console.log(`  Mean: ${format.ms(clientStats.mean)} ± ${clientStats.stdDev.toFixed(2)}ms`);
  console.log(`  p95:  ${format.ms(clientStats.p95)}`);

  if (serverStats) {
    console.log(`\n${format.bold('Server Latency (Internal)')}`);
    console.log(`  Mean: ${format.ms(serverStats.mean)} ± ${serverStats.stdDev.toFixed(2)}ms`);
    console.log(`  p95:  ${format.ms(serverStats.p95)}`);
  }

  if (!process.stdout.isTTY) {
    console.log(JSON.stringify({
      endpoint: options.endpoint,
      method: options.method,
      successRate: (successes.length / results.length) * 100,
      client: clientStats,
      server: serverStats
    }, null, 2));
  }
}

run().catch(error => {
  console.error(`\n${format.error('Fatal Error:')}`, error);
  process.exit(1);
});
