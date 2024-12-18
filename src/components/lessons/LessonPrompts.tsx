import React from 'react';
import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore'; 
import { deductTokens, refundTokens } from '../../utils/tokenManager';
import { sendPrompt } from '../../utils/promptHandler';
import '../../styles/lessons/LessonPrompts.css';

interface LessonPromptsProps {
  lessonTitle: string;
}

const defaultPrompts = [
  'Можете объяснить подробнее про роли бизнес-аналитика?',
  'Какие основные инструменты использует бизнес-аналитик?',
  'Приведите примеры реальных задач бизнес-аналитика',
  'Какие soft skills важны для бизнес-аналитика?',
  'Как начать карьеру бизнес-аналитика?'
];

export default function LessonPrompts({ lessonTitle }: LessonPromptsProps) {
  const { user, tokens, setTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const handlePromptClick = async (prompt: string) => {
    if (!user) {
      setResponse('Пожалуйста, войдите в систему чтобы задавать вопросы');
      return;
    }

    if (tokens < 5) {
      setResponse('Недостаточно токенов для отправки вопроса');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    
    try {
      const newTokens = await deductTokens(user.uid, tokens, 5);
      setTokens(newTokens);

      const data = await sendPrompt(prompt, lessonTitle);
      
      setResponse(data.response);
      
    } catch (error) {
      console.error('Error sending prompt:', error);
      
      const refundedTokens = await refundTokens(user.uid, tokens, 5);
      setTokens(refundedTokens);
      
      setResponse(
        'Произошла ошибка при получении ответа. Токены возвращены. ' +
        'Пожалуйста, попробуйте позже.'
      );
    } finally {
      setIsLoading(false);
      if (response) {
        window.scrollTo({ 
          top: document.body.scrollHeight, 
          behavior: 'smooth' 
        });
      }
    }
  };

  const handleCustomPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customPrompt.trim()) return;
    
    await handlePromptClick(customPrompt);
    setCustomPrompt('');
  };

  const clearResponse = () => {
    setResponse(null);
  };

  return (
    <div className="lesson-prompts">
      <h3>Популярные вопросы</h3>
      <div className="prompts-list">
        {defaultPrompts.map((prompt, index) => (
          <button
            key={index}
            className="prompt-button"
            onClick={() => !isLoading && handlePromptClick(prompt)}
            disabled={!user || tokens < 5}
          >
            {prompt}
            <span className="token-cost">5 🪙</span>
          </button>
        ))}
      </div>
      
      <div className="custom-prompt">
        <h3>Задать свой вопрос</h3>
        <form onSubmit={handleCustomPrompt}>
          <textarea
            ref={promptInputRef}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Введите ваш вопрос..."
            disabled={isLoading || !user || tokens < 5}
          />
          <div className="prompt-controls">
            <span className="token-cost">5 🪙</span>
            <button
              type="submit"
              className="submit-prompt"
              disabled={isLoading || !user || tokens < 5 || !customPrompt.trim()}
            >
              Отправить вопрос
            </button>
          </div>
        </form>
      </div>
      {!user && (
        <p className="login-prompt">
          <a href="/login">Войдите</a> или <a href="/register">зарегистрируйтесь</a> чтобы задавать вопросы
        </p>
      )}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Генерирую ответ...</p>
        </div>
      )}
      {response && (
        <div className="ai-response">
          <div className="response-content">{response}</div>
          <button onClick={clearResponse} className="close-response">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}