'use client';

interface PatientFormErrorProps {
  error: any;
}

export function PatientFormError({ error }: PatientFormErrorProps) {
  if (!error) return null;

  const getErrorMessage = (error: any): string => {
    if (!error) return 'Failed to create patient. Please try again.';
    if (error.message) return error.message;
    if (error.response?.data?.message) return error.response.data.message;
    if (typeof error === 'string') return error;
    return 'Failed to create patient. Please check the information and try again.';
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Error Creating Patient</h3>
          <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
        </div>
      </div>
    </div>
  );
}
