import { useState, useEffect } from 'react';
import questionsData from '../public/Questions.json';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import '../public/NotoSans-Regular-normal.js';

function App() {
  const [answers, setAnswers] = useState({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedQuizzes, setSubmittedQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('quiz');
  const [db, setDb] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    gender: '',
  });
  const [showPatientForm, setShowPatientForm] = useState(true);

  // Инициализация IndexedDB
  useEffect(() => {
    const request = indexedDB.open('HealthAssessmentDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('quizzes')) {
        const store = db.createObjectStore('quizzes', { keyPath: 'id' });
        // Создаем индекс для поиска по имени пациента
        store.createIndex('patientName', 'patientInfo.name', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      setDb(event.target.result);
      loadQuizzesFromDB(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
    };

    return () => {
      if (db) db.close();
    };
  }, []);

  const generatePDF = (quiz) => {
    try {
      // Инициализация документа
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Установка шрифта (должен быть загружен заранее)
      doc.setFont('NotoSans-Regular');
      doc.setFontSize(12);

      // Заголовок
      doc.setFontSize(16);
      doc.text('Результаты опроса HAQ-DI', 105, 20, { align: 'center' });

      // Информация о пациенте
      doc.setFontSize(12);
      let yPos = 30;
      doc.text(`Пациент: ${quiz.patientInfo.name}`, 20, yPos);
      doc.text(`Возраст: ${quiz.patientInfo.age} лет`, 20, yPos + 10);
      if (quiz.patientInfo.gender) {
        doc.text(`Пол: ${quiz.patientInfo.gender === 'male' ? 'мужской' : 'женский'}`, 20, yPos + 20);
        yPos += 10;
      }
      doc.text(`Дата опроса: ${quiz.date}`, 20, yPos + 20);
      doc.text(`Общий балл: ${quiz.score}/3 (${getInterpretation(quiz.score)})`, 20, yPos + 30);
      yPos += 35;

      // Подготовка данных для таблицы
      const body = [];

      questionsData.categories.forEach((category) => {
        // Добавляем категорию как разделитель
        body.push([
          {
            content: category.category,
            colSpan: 4,
            styles: {
              fillColor: [229, 231, 235], // серый фон
              fontStyle: 'normal',
              font: 'NotoSans-Regular',
            },
          },
        ]);

        // Добавляем вопросы и ответы
        category.questions.forEach((question) => {
          const answer =
            quiz.answers[question.id] !== null
              ? question.options.find((o) => o.value === quiz.answers[question.id])?.label
              : '—';
          const score = quiz.answers[question.id] !== null ? quiz.answers[question.id] : '';

          body.push([
            { content: question.text, styles: { font: 'NotoSans-Regular' } },
            { content: answer, styles: { font: 'NotoSans-Regular' } },
            { content: score, styles: { font: 'NotoSans-Regular' } },
          ]);
        });
      });

      // Генерация таблицы
      autoTable(doc, {
        head: [
          [
            { content: 'Вопрос', styles: { font: 'NotoSans-Regular', fontStyle: 'normal' } },
            { content: 'Ответ', styles: { font: 'NotoSans-Regular', fontStyle: 'normal' } },
            { content: 'Балл', styles: { font: 'NotoSans-Regular', fontStyle: 'normal' } },
          ],
        ],
        body: body,
        startY: yPos,
        margin: { left: 20, right: 20 },
        styles: {
          font: 'NotoSans-Regular',
          fontStyle: 'normal',
          fontSize: 10,
          cellPadding: 4,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [79, 70, 229], // indigo-600
          textColor: [255, 255, 255],
          fontStyle: 'normal',
          font: 'NotoSans-Regular',
        },
        columnStyles: {
          0: { cellWidth: 'auto' }, // Вопрос
          1: { cellWidth: 40 }, // Ответ
          2: { cellWidth: 20 }, // Балл
        },
        didDrawPage: (data) => {
          // Номер страницы
          doc.setFontSize(10);
          doc.text(`Страница ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
      });

      // Сохранение PDF
      doc.save(`HAQ-DI_${quiz.patientInfo.name.replace(/ /g, '_')}.pdf`);
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
      alert('Не удалось сгенерировать PDF-отчет');
    }
  };

  // Обработчик изменения данных пациента
  const handlePatientInfoChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Начало опроса после ввода данных пациента
  const startQuestionnaire = (e) => {
    e.preventDefault();
    if (patientInfo.name.trim() && patientInfo.age) {
      setShowPatientForm(false);

      // Инициализация состояния ответов
      const initialAnswers = {};
      questionsData.categories.forEach((category) => {
        category.questions.forEach((question) => {
          initialAnswers[question.id] = null;
        });
      });
      setAnswers(initialAnswers);
    }
  };

  // Загрузка сохраненных опросов из IndexedDB
  const loadQuizzesFromDB = (database) => {
    const transaction = database.transaction(['quizzes'], 'readonly');
    const store = transaction.objectStore('quizzes');
    const request = store.getAll();

    request.onsuccess = (event) => {
      setSubmittedQuizzes(event.target.result || []);
    };

    request.onerror = (event) => {
      console.error('Error loading quizzes:', event.target.error);
    };
  };

  // Инициализация состояния ответов
  useEffect(() => {
    const initialAnswers = {};
    questionsData.categories.forEach((category) => {
      category.questions.forEach((question) => {
        initialAnswers[question.id] = null;
      });
    });
    setAnswers(initialAnswers);
  }, []);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNextCategory = () => {
    setCurrentCategoryIndex((prev) => prev + 1);
  };

  const handlePrevCategory = () => {
    setCurrentCategoryIndex((prev) => prev - 1);
  };

  // Сохранение опроса в IndexedDB
  const saveQuizToDB = (quizData) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject('Database not initialized');
        return;
      }

      const transaction = db.transaction(['quizzes'], 'readwrite');
      const store = transaction.objectStore('quizzes');
      const request = store.add(quizData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error saving quiz:', event.target.error);
        reject(event.target.error);
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newQuiz = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      patientInfo: { ...patientInfo },
      answers: { ...answers },
      score: calculateTotalScore(),
    };

    try {
      await saveQuizToDB(newQuiz);
      setSubmittedQuizzes((prev) => [...prev, newQuiz]);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert('Не удалось сохранить результаты. Пожалуйста, попробуйте снова.');
    }
  };

  // Удаление опроса из IndexedDB
  const deleteQuizFromDB = async (quizId) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject('Database not initialized');
        return;
      }

      const transaction = db.transaction(['quizzes'], 'readwrite');
      const store = transaction.objectStore('quizzes');
      const request = store.delete(quizId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error deleting quiz:', event.target.error);
        reject(event.target.error);
      };
    });
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот опрос?')) return;

    try {
      await deleteQuizFromDB(quizId);
      setSubmittedQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      alert('Не удалось удалить опрос. Пожалуйста, попробуйте снова.');
    }
  };

  const resetQuiz = () => {
    const resetAnswers = {};
    Object.keys(answers).forEach((key) => {
      resetAnswers[key] = null;
    });
    setAnswers(resetAnswers);
    setCurrentCategoryIndex(0);
    setIsSubmitted(false);
  };

  const calculateTotalScore = () => {
    const values = Object.values(answers).filter((val) => val !== null);
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return (sum / values.length).toFixed(2);
  };

  const isCurrentCategoryComplete = () => {
    const currentQuestions = questionsData.categories[currentCategoryIndex].questions;
    return currentQuestions.every((question) => answers[question.id] !== null);
  };

  const isFormValid = () => {
    return Object.values(answers).every((val) => val !== null);
  };

  const currentCategory = questionsData.categories[currentCategoryIndex];
  const isLastCategory = currentCategoryIndex === questionsData.categories.length - 1;
  const isFirstCategory = currentCategoryIndex === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
          <h1 className="text-3xl font-bold text-white text-center">{questionsData.questionnaire}</h1>
          <p className="text-white text-center mt-2">{questionsData.description}</p>
        </div>

        {showPatientForm ? (
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Данные пациента</h2>
            <form onSubmit={startQuestionnaire} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  ФИО пациента*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={patientInfo.name}
                  onChange={handlePatientInfoChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                  Возраст*
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  min="1"
                  max="120"
                  value={patientInfo.age}
                  onChange={handlePatientInfoChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Пол</label>
                <div className="mt-1 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={patientInfo.gender === 'male'}
                      onChange={handlePatientInfoChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Мужской</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={patientInfo.gender === 'female'}
                      onChange={handlePatientInfoChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Женский</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!patientInfo.name.trim() || !patientInfo.age}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    !patientInfo.name.trim() || !patientInfo.age ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Начать опрос
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
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

            <div className="p-6">
              {activeTab === 'quiz' ? (
                <div className="space-y-6">
                  {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Категория {currentCategoryIndex + 1} из {questionsData.categories.length}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          Вопросов: {currentCategory.questions.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${((currentCategoryIndex + 1) / questionsData.categories.length) * 100}%` }}
                        ></div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
                          {currentCategory.category}
                        </h2>

                        {currentCategory.questions.map((question) => (
                          <div key={question.id} className="space-y-4 pt-4">
                            <h3 className="text-lg font-medium text-gray-900">{question.text}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              {question.options.map((option) => (
                                <label
                                  key={`q${question.id}-${option.value}`}
                                  className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                                    answers[question.id] === option.value
                                      ? 'border-indigo-500 bg-indigo-50'
                                      : 'border-gray-300 hover:border-indigo-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option.value}
                                    checked={answers[question.id] === option.value}
                                    onChange={() => handleAnswerChange(question.id, option.value)}
                                    className="absolute opacity-0 h-0 w-0"
                                  />
                                  <div className="flex flex-col items-center text-center">
                                    <div
                                      className={`w-5 h-5 rounded-full border flex items-center justify-center mb-2 ${
                                        answers[question.id] === option.value
                                          ? 'border-indigo-500 bg-indigo-500'
                                          : 'border-gray-400'
                                      }`}
                                    >
                                      {answers[question.id] === option.value && (
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                      )}
                                    </div>
                                    <span className="text-gray-700 text-sm">{option.label}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={handlePrevCategory}
                          disabled={isFirstCategory}
                          className={`py-2 px-4 rounded-md shadow-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                            isFirstCategory ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          Назад
                        </button>

                        {!isLastCategory ? (
                          <button
                            type="button"
                            onClick={handleNextCategory}
                            disabled={!isCurrentCategoryComplete()}
                            className={`py-2 px-4 rounded-md shadow-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                              !isCurrentCategoryComplete()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            Далее
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={!isFormValid()}
                            className={`py-2 px-4 rounded-md shadow-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                              !isFormValid() ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            Завершить опрос
                          </button>
                        )}
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
                      <h2 className="text-2xl font-semibold text-gray-800">Опрос завершен!</h2>
                      <div className="bg-gray-50 p-6 rounded-lg space-y-4 text-left">
                        <h3 className="font-medium text-gray-900">Результаты:</h3>
                        <p className="text-lg">
                          <span className="font-semibold">Общий балл:</span> {calculateTotalScore()}/3
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-indigo-600 h-4 rounded-full"
                            style={{ width: `${(calculateTotalScore() / 3) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600">{getInterpretation(calculateTotalScore())}</p>
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
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative"
                        >
                          <div className="absolute top-2 right-2 flex space-x-2">
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Удалить опрос"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => generatePDF(quiz)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Скачать PDF"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-sm font-medium text-gray-900">
                              {quiz.patientInfo.name}, {quiz.patientInfo.age} лет
                              {quiz.patientInfo.gender &&
                                `, ${quiz.patientInfo.gender === 'male' ? 'мужской' : 'женский'} пол`}
                            </h3>
                          </div>

                          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-900">Опрос от {quiz.date}</h3>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                              Балл: {quiz.score}/3
                            </span>
                          </div>
                          <div className="px-5 py-4">
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Уровень ограничений:</span>
                                <span>{getInterpretation(quiz.score)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-indigo-600 h-2.5 rounded-full"
                                  style={{ width: `${(quiz.score / 3) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {questionsData.categories.map((category) => (
                                <div key={category.category} className="space-y-2">
                                  <h4 className="font-medium text-gray-900">{category.category}</h4>
                                  <ul className="space-y-1">
                                    {category.questions.map((question) => (
                                      <li key={question.id} className="flex justify-between text-sm">
                                        <span className="text-gray-600 truncate max-w-[180px]">{question.text}</span>
                                        <span className="font-medium">
                                          {quiz.answers[question.id] !== null
                                            ? question.options.find((o) => o.value === quiz.answers[question.id])?.label
                                            : '—'}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getInterpretation(score) {
  const numScore = parseFloat(score);
  if (numScore === 0) return 'Нет ограничений';
  if (numScore <= 1) return 'Легкие ограничения';
  if (numScore <= 2) return 'Умеренные ограничения';
  return 'Тяжелые ограничения';
}

export default App;
