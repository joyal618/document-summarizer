import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Transition } from '@headlessui/react';
import { FaFileUpload, FaSpinner, FaFilePdf, FaFileWord, FaTimesCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Typewriter from 'typewriter-effect';

function App() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" ||
          selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setFileType(selectedFile.type);
        setError('');
        setSummary('');
      } else {
        setError('Unsupported file type. Please upload a PDF or DOCX file.');
        setFile(null);
        setFileName('');
        setFileType('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileName('');
    setFileType('');
    setSummary('');
    setError('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

 const handleUpload = async () => {
  if (!file) {
    setError('Please select a file to summarize.');
    return;
  }

  setLoading(true);
  setSummary('');
  setError('');

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    setError('API endpoint is not configured');
    setLoading(false);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${apiUrl}/upload`, formData, {});
    setSummary(response.data.summary);
  } catch (err) {
    console.error('Upload error:', err);
    if (err.response) {
      if (err.response.status === 400) {
        setError(err.response.data || 'Unsupported file type or empty content.');
      } else if (err.response.status === 500) {
        setError('Server error: Could not process the file. Please try again.');
      } else {
        setError(`An unexpected error occurred: ${err.response.status} - ${err.response.statusText}`);
      }
    } else if (err.request) {
      setError('No response from server. Please check your network connection or server status.');
    } else {
      setError('An unknown error occurred while preparing the request.');
    }
    setSummary('');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-6 text-center tracking-tight">
          📄 Document Summarizer
        </h2>
        <p className="text-center text-gray-600 mb-8 max-w-md mx-auto">
          Upload your PDF or DOCX file to get a quick summary powered by Google Gemini AI.
        </p>

        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 mb-8 text-center bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center">
              {file ? (
                <div className="flex items-center text-blue-700 text-lg font-medium">
                  {fileType === "application/pdf" ? <FaFilePdf className="text-red-500 text-2xl mr-2" /> : <FaFileWord className="text-blue-500 text-2xl mr-2" />}
                  <span>{fileName}</span>
                  <button onClick={clearFile} className="ml-4 text-gray-500 hover:text-red-600 focus:outline-none" title="Remove file">
                    <FaTimesCircle className="text-xl" />
                  </button>
                </div>
              ) : (
                // This is the first place you had a Fragment that needs a wrapper div
                <div className="flex flex-col items-center justify-center">
                  <FaFileUpload className="text-blue-500 text-4xl mb-3" />
                  <p className="text-lg text-blue-700 font-semibold">
                    Drag & Drop your file here or <span className="underline">click to browse</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    (PDF or DOCX, max 10MB recommended)
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>

        <button
          onClick={handleUpload}
          className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 cursor-pointer ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
          `}
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-3" /> Summarizing...
            </>
          ) : (
            <>
              Summarize Document
            </>
          )}
        </button>

        <Transition
          show={!!error}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* This is the second place the Fragment was causing an issue */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-6 rounded" role="alert">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-3 text-xl" />
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}
        </Transition>

        <Transition
          show={!!summary || loading}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* This is the third place the Fragment was causing an issue */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" /> AI Summary:
            </h3>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-inner min-h-[100px] text-gray-700 leading-relaxed overflow-auto max-h-96">
              {loading && !summary ? (
                <p className="text-gray-500">Generating summary, please wait...</p>
              ) : (
                <Typewriter
                  options={{
                    strings: summary,
                    autoStart: true,
                    delay: 15,
                    cursor: '',
                  }}
                  onInit={(typewriter) => {
                    typewriter.typeString(summary).start();
                  }}
                />
              )}
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
}

export default App;