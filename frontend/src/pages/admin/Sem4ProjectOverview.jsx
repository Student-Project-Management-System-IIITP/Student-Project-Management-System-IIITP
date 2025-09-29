import React from 'react';
import Layout from '../../components/common/Layout';
import Sem4ProjectOverview from '../../components/admin/Sem4ProjectOverview';

const Sem4ProjectOverviewPage = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sem 4 Project Overview</h1>
          <p className="text-gray-600 mt-2">
            Manage all B.Tech Semester 4 Minor Project 1 projects
          </p>
        </div>

        <Sem4ProjectOverview />
      </div>
    </Layout>
  );
};

export default Sem4ProjectOverviewPage;
