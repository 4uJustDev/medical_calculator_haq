import { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('quiz');
  const [answers, setAnswers] = useState({
    question1: '',
    question2: '',
  });
  const [submittedQuizzes, setSubmittedQuizzes] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (question, value) => {
    setAnswers((prev) => ({
      ...prev,
      [question]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newQuiz = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      answers: { ...answers },
    };
    setSubmittedQuizzes((prev) => [...prev, newQuiz]);
    setIsSubmitted(true);
  };

  const resetQuiz = () => {
    setAnswers({
      question1: '',
      question2: '',
    });
    setIsSubmitted(false);
  };

  const isFormValid = answers.question1 && answers.question2;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Заголовок */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
          <h1 className="text-3xl font-bold text-white text-center">Опросник</h1>
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'quiz'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('quiz')}
          >
            Опрос
          </button>
          <button
            className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Мои ответы
          </button>
        </div>

        {/* Контент вкладок */}
        <div className="p-6">
          {activeTab === 'quiz' ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Пройти опрос</h2>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Вопрос 1 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Вопрос 1: Какой язык программирования вам нравится больше?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['JavaScript', 'Python', 'Java', 'C++'].map((option) => (
                        <label
                          key={`q1-${option}`}
                          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                            answers.question1 === option
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="question1"
                            value={option}
                            checked={answers.question1 === option}
                            onChange={() => handleChange('question1', option)}
                            className="absolute opacity-0 h-0 w-0"
                          />
                          <div className="flex items-center">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                                answers.question1 === option ? 'border-indigo-500 bg-indigo-500' : 'border-gray-400'
                              }`}
                            >
                              {answers.question1 === option && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Вопрос 2 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Вопрос 2: Какой фреймворк вы предпочитаете?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['React', 'Vue', 'Angular', 'Svelte'].map((option) => (
                        <label
                          key={`q2-${option}`}
                          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                            answers.question2 === option
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="question2"
                            value={option}
                            checked={answers.question2 === option}
                            onChange={() => handleChange('question2', option)}
                            className="absolute opacity-0 h-0 w-0"
                          />
                          <div className="flex items-center">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                                answers.question2 === option ? 'border-indigo-500 bg-indigo-500' : 'border-gray-400'
                              }`}
                            >
                              {answers.question2 === option && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Кнопка отправки */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={!isFormValid}
                      className={`w-full py-3 px-4 rounded-md shadow-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                        isFormValid ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Отправить ответы
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-6 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                    <svg
                      className="w-8 h-8 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800">Спасибо за участие!</h2>
                  <div className="bg-gray-50 p-6 rounded-lg space-y-4 text-left">
                    <h3 className="font-medium text-gray-900">Ваши ответы:</h3>
                    <ul className="space-y-2">
                      <li className="flex">
                        <span className="text-gray-600 w-32">Вопрос 1:</span>
                        <span className="font-medium">{answers.question1}</span>
                      </li>
                      <li className="flex">
                        <span className="text-gray-600 w-32">Вопрос 2:</span>
                        <span className="font-medium">{answers.question2}</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={resetQuiz}
                    className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  >
                    Пройти опрос снова
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Мои ответы</h2>

              {submittedQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Вы еще не проходили опрос</h3>
                  <p className="mt-1 text-gray-500">Перейдите на вкладку "Опрос", чтобы принять участие.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                      <svg
                        className="-ml-1 mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Пройти опрос
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {submittedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900">Опрос от {quiz.date}</h3>
                      </div>
                      <div className="px-5 py-4">
                        <ul className="space-y-3">
                          <li className="flex">
                            <span className="text-gray-600 w-32">Вопрос 1:</span>
                            <span className="font-medium">{quiz.answers.question1}</span>
                          </li>
                          <li className="flex">
                            <span className="text-gray-600 w-32">Вопрос 2:</span>
                            <span className="font-medium">{quiz.answers.question2}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
