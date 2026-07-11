import React, { useState, useEffect } from 'react';
import { hapticFeedback, hapticNotification } from '../telegram';

interface Answer {
  answerId: number;
  answer: string;
  correct: boolean;
}

interface MCQData {
  question: {
    plainQuestion: string;
    answers: Answer[];
    ansExplanation: string;
  };
  subject: string;
}

export default function McqOfTheDay() {
  const [data, setData] = useState<MCQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchMCQ = async () => {
      try {
        const response = await fetch("https://api.arisemedicalacademy.com/instituteApp/library/getQuestionOfTheDay", {
          method: "GET",
          headers: {
            "appId": "mobile",
            "deviceType": "ios",
            "Accept": "application/json, text/plain, */*",
            "Authorization": "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJwc3JpaGFyaTIzOEBnbWFpbC5jb20iLCJ0ZW5hbnRJZCI6IjQzSUJNeWlBOERCTSIsImV4cCI6MTc4NzIxNjY2OSwiaWF0IjoxNzgzNzYwNjY5LCJqdGkiOiI5ZmQ5Y2IxOC0wMjIyLTQ5ZTUtOTRhNC1iMjNiYTEzMWI4Y2UifQ.4QSgK5f-VJAfXr5XB6yndFbPo-lhBkEbgbBXp9OobDfejKRJCuuC_IsOKF_tbbiB7sHROgaWJmjT8mCI8rDrIg",
            "appVersion": "1.5.5",
            "tenantId": "43IBMyiA8DBM",
            "userEmail": "psrihari238@gmail.com",
            "DeviceId": "54B4406E-A891-4769-BB6D-2C714C967ED0",
            "DeviceInfo": JSON.stringify({"model":"iPhone15,2","osVersion":"27.0","manufacturer":"Apple","platform":"ios"}),
            "Origin": "capacitor://localhost",
          },
        });

        if (!response.ok) throw new Error('Failed to fetch MCQ');
        
        const json = await response.json();
        if (json.status === 'OK' && json.result) {
          setData(json.result);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching MCQ');
      } finally {
        setLoading(false);
      }
    };

    fetchMCQ();
  }, []);

  const handleSelect = (ans: Answer) => {
    if (selectedId) return; // Prevent re-selection
    hapticNotification(ans.correct ? 'success' : 'error');
    setSelectedId(ans.answerId);
  };

  if (loading) {
    return (
      <div className="mcq-card loading">
        <div className="spinner"></div>
        <span>Loading Question of the Day...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mcq-card error">
        <span>⚠️ Could not load MCQ of the Day</span>
      </div>
    );
  }

  const { question, subject } = data;

  return (
    <div className="mcq-card">
      <div className="mcq-header">
        <span className="mcq-badge">MCQ OF THE DAY</span>
        <span className="mcq-subject">{subject}</span>
      </div>
      
      <h3 className="mcq-question">{question.plainQuestion}</h3>

      <div className="mcq-options">
        {question.answers.map((ans) => {
          const isSelected = selectedId === ans.answerId;
          const isCorrect = ans.correct;
          const showAsCorrect = selectedId !== null && isCorrect;
          const showAsWrong = isSelected && !isCorrect;
          
          let className = "mcq-option";
          if (showAsCorrect) className += " correct";
          if (showAsWrong) className += " wrong";
          if (selectedId && !showAsCorrect && !showAsWrong) className += " disabled";

          return (
            <button 
              key={ans.answerId}
              className={className}
              onClick={() => handleSelect(ans)}
              disabled={selectedId !== null}
            >
              {ans.answer}
              {showAsCorrect && <span className="mcq-icon">✅</span>}
              {showAsWrong && <span className="mcq-icon">❌</span>}
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className="mcq-explanation">
          <button 
            className="mcq-explain-btn" 
            onClick={() => { hapticFeedback('light'); setShowExplanation(!showExplanation); }}
          >
            {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
          </button>
          
          {showExplanation && (
            <div 
              className="mcq-explain-content"
              dangerouslySetInnerHTML={{ __html: question.ansExplanation }}
            />
          )}
        </div>
      )}
    </div>
  );
}
