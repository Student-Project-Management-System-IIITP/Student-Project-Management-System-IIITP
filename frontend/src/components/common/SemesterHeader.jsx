import React from 'react';

const SemesterHeader = ({ semester, degree, academicYear, className = '' }) => {
  const getSemesterInfo = (semester, degree) => {
    const year = Math.ceil(semester / 2);
    
    let semesterName = '';
    let projectType = '';
    let colorScheme = '';
    
    if (degree === 'B.Tech') {
      switch (semester) {
        case 4:
          semesterName = 'Fourth Semester';
          projectType = 'Minor Project 1';
          colorScheme = 'bg-blue-50 border-blue-200 text-blue-800';
          break;
        case 5:
          semesterName = 'Fifth Semester';
          projectType = 'Minor Project 2';
          colorScheme = 'bg-purple-50 border-purple-200 text-purple-800';
          break;
        case 6:
          semesterName = 'Sixth Semester';
          projectType = 'Minor Project 3';
          colorScheme = 'bg-indigo-50 border-indigo-200 text-indigo-800';
          break;
        case 7:
          semesterName = 'Seventh Semester';
          projectType = 'Major Project 1';
          colorScheme = 'bg-green-50 border-green-200 text-green-800';
          break;
        case 8:
          semesterName = 'Eighth Semester';
          projectType = 'Major Project 2';
          colorScheme = 'bg-orange-50 border-orange-200 text-orange-800';
          break;
        default:
          semesterName = `Semester ${semester}`;
          projectType = 'Project';
          colorScheme = 'bg-gray-50 border-gray-200 text-gray-800';
      }
    } else if (degree === 'M.Tech') {
      switch (semester) {
        case 1:
          semesterName = 'First Semester';
          projectType = 'Minor Project 1';
          colorScheme = 'bg-blue-50 border-blue-200 text-blue-800';
          break;
        case 2:
          semesterName = 'Second Semester';
          projectType = 'Minor Project 2';
          colorScheme = 'bg-purple-50 border-purple-200 text-purple-800';
          break;
        case 3:
          semesterName = 'Third Semester';
          projectType = 'Major Project 1 / Internship';
          colorScheme = 'bg-green-50 border-green-200 text-green-800';
          break;
        case 4:
          semesterName = 'Fourth Semester';
          projectType = 'Major Project 2 / Internship';
          colorScheme = 'bg-orange-50 border-orange-200 text-orange-800';
          break;
        default:
          semesterName = `Semester ${semester}`;
          projectType = 'Project';
          colorScheme = 'bg-gray-50 border-gray-200 text-gray-800';
      }
    }
    
    return { semesterName, projectType, year, colorScheme };
  };

  const { semesterName, projectType, year, colorScheme } = getSemesterInfo(semester, degree);
  
  const currentYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  return (
    <div className={`rounded-lg border p-6 mb-6 ${colorScheme} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {degree} - {semesterName}
          </h1>
          <p className="text-lg opacity-75 mt-1">
            {projectType}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm opacity-75">
            <span>Year {year}</span>
            <span>•</span>
            <span>Academic Year: {currentYear}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">
            Sem {semester}
          </div>
          <div className="text-sm opacity-75">
            {degree}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemesterHeader;
