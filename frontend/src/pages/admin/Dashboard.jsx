import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// Helper to compute default password from a name: alpha-only, capitalize first letter, append @iiitp
const computeDefaultPassword = (name) => {
  const onlyAlpha = (name || '').replace(/[^a-zA-Z]/g, '');
  const lower = onlyAlpha.toLowerCase();
  const capitalized = lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
  return `${capitalized}@iiitp`;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    department: 'CSE',
    designation: 'Department Admin'
  });

  // Add Faculty modal state
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isSubmittingFaculty, setIsSubmittingFaculty] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'CSE',
    mode: 'Regular',
    designation: 'Assistant Professor'
  });

  const defaultPassword = useMemo(() => computeDefaultPassword(form.name), [form.name]);
  
  const facultyDefaultPassword = useMemo(() => computeDefaultPassword(facultyForm.name), [facultyForm.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFacultyChange = (e) => {
    const { name, value } = e.target;
    setFacultyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const payload = {
        fullName: form.name,
        collegeEmail: form.email,
        contactNumber: form.phone,
        department: form.department,
        designation: form.designation,
        password: defaultPassword,
        confirmPassword: defaultPassword
      };

      const res = await fetch('http://localhost:3000/auth/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Admin created successfully. Default password: ' + defaultPassword);
        setIsAddOpen(false);
        setForm({ name: '', phone: '', email: '', department: 'CSE', designation: 'Department Admin' });
      } else {
        alert(data.message || 'Failed to create admin');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingFaculty) return;
    try {
      setIsSubmittingFaculty(true);

      const payload = {
        fullName: facultyForm.name,
        department: facultyForm.department,
        mode: facultyForm.mode,
        designation: facultyForm.designation,
        collegeEmail: facultyForm.email,
        contactNumber: facultyForm.phone,
        password: facultyDefaultPassword,
        confirmPassword: facultyDefaultPassword
      };

      const res = await fetch('http://localhost:3000/auth/signup/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Faculty created successfully. Default password: ' + facultyDefaultPassword);
        setIsAddFacultyOpen(false);
        setFacultyForm({ name: '', email: '', phone: '', department: 'CSE', mode: 'Regular', designation: 'Assistant Professor' });
      } else {
        alert(data.message || 'Failed to create faculty');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmittingFaculty(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user?.name || 'Administrator'}! Manage the SPMS system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Add Admin
          </button>
          <button
            onClick={() => setIsAddFacultyOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Faculty
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">New Student Registration</h3>
                  <p className="text-sm text-gray-600">John Doe registered for B.Tech</p>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Project Submission</h3>
                  <p className="text-sm text-gray-600">Minor Project 2 submitted by Group A</p>
                </div>
                <span className="text-sm text-gray-500">4 hours ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Database Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Server Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Last Backup</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Admin</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select name="department" value={form.department} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ASH">ASH</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Designation</label>
                  <select name="designation" value={form.designation} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Super Admin</option>
                    <option>Department Admin</option>
                    <option>System Admin</option>
                    <option>Academic Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Generated Password</label>
                  <input value={defaultPassword} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2" />
                  <p className="text-xs text-gray-500 mt-1">Password is generated from name by removing spaces/special characters and appending @iiitp.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddFacultyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Faculty</h3>
              <button onClick={() => setIsAddFacultyOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleFacultySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name</label>
                  <input name="name" value={facultyForm.name} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={facultyForm.email} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" value={facultyForm.phone} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select name="department" value={facultyForm.department} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ASH">ASH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mode</label>
                  <select name="mode" value={facultyForm.mode} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="Regular">Regular</option>
                    <option value="Adjunct">Adjunct</option>
                    <option value="On Lien">On Lien</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Designation</label>
                  <select name="designation" value={facultyForm.designation} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option>HOD</option>
                    <option>Assistant Professor</option>
                    <option>Adjunct Assistant Professor</option>
                    <option>Assistant Registrar</option>
                    <option>TPO</option>
                    <option>Warden</option>
                    <option>Chief Warden</option>
                    <option>Associate Dean</option>
                    <option>Coordinator(PG, PhD)</option>
                    <option>Tenders/Purchase</option>
                  </select>
                </div>
                {/* Faculty ID removed per requirement */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Generated Password</label>
                  <input value={facultyDefaultPassword} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2" />
                  <p className="text-xs text-gray-500 mt-1">Password is generated from name by removing spaces/special characters and appending @iiitp.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddFacultyOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" disabled={isSubmittingFaculty} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                  {isSubmittingFaculty ? 'Creating...' : 'Create Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
