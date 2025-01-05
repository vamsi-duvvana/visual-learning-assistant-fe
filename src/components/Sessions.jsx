import React from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

const Sessions = ({ sessions, onSessionClick }) => {
  const [expandedSession, setExpandedSession] = React.useState(null);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-lg font-semibold mb-2">Previous Sessions</h3>
      {sessions.map((session, index) => (
        <div key={session.timestamp} className="border rounded-lg p-4 bg-white shadow-sm">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setExpandedSession(expandedSession === index ? null : index)}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDate(session.timestamp)}</span>
            </div>
            {expandedSession === index ? <ChevronUp /> : <ChevronDown />}
          </div>
          
          {expandedSession === index && (
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <strong>Analysis:</strong>
                <p className="text-gray-600">{session.image_analysis}</p>
              </div>
              <div className="text-sm">
                <strong>Context:</strong>
                <p className="text-gray-600">{session.context}</p>
              </div>
              <div className="text-sm">
                <strong>Solution:</strong>
                <p className="text-gray-600">{session.solution}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sessions;
