import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const navigate = useNavigate();

  useEffect(() => {
    const processAuth = () => {
      try {
        // Extract the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authorization error: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code found in URL');
          return;
        }

        // Send the code to the parent window
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_CODE', code },
            window.location.origin
          );
          setStatus('success');
          setMessage('Authentication successful! You can close this window and return to the app.');
          
          // Close this window after a short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // If no opener, we're in a new tab
          setStatus('success');
          setMessage('Authentication successful! You can close this tab and return to the app.');
          // Store code in session storage to retrieve it in the main app
          sessionStorage.setItem('google_auth_code', code);
          // Redirect to the main app after a short delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (error) {
        setStatus('error');
        setMessage(`Error processing authentication: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">
        Google Drive Authentication
      </h1>
      
      <div className={`p-4 rounded-md mb-4 ${
        status === 'processing' ? 'bg-blue-100 text-blue-700' :
        status === 'success' ? 'bg-green-100 text-green-700' :
        'bg-red-100 text-red-700'
      }`}>
        <p>{message}</p>
      </div>
      
      {status === 'success' && (
        <p>You will be redirected automatically in a moment.</p>
      )}
      
      {status === 'error' && (
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to App
        </button>
      )}
    </div>
  );
}