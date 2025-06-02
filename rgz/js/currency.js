document.addEventListener('DOMContentLoaded', function() {
	// Элементы интерфейса
	const amountInput = document.getElementById('amount'); // Поле ввода суммы
	const fromCurrencySelect = document.getElementById('fromCurrency'); // Выбор исходной валюты
	const toCurrencySelect = document.getElementById('toCurrency'); // Выбор целевой валюты
	const switchBtn = document.getElementById('switchCurrencies'); // Кнопка переключения валют
	const calculateBtn = document.getElementById('calculate'); // Кнопка расчета
	const resultDiv = document.getElementById('result'); // Блок для вывода результата
	const currentRateValue = document.getElementById('currentRateValue'); // Элемент для отображения текущего курса
	const rateDate = document.getElementById('rateDate'); // Элемент для отображения даты курса
	const chart = document.getElementById('chart'); // Контейнер для графика
	const chartInfo = document.getElementById('chartInfo'); // Доп. информация к графику
	const chartLoading = document.getElementById('chartLoading'); // Сообщение о загрузке
	
	// Переменные для хранения данных о курсах
	let currentRate = 0; // Текущий курс BRL
	let historicalRates = []; // Массив исторических данных
	
	// Загрузка текущего курса
	function loadCurrentRate() {
		fetch('https://www.cbr-xml-daily.ru/daily_json.js') // Делаем запрос к API Центробанка
			.then(response => response.json()) // Преобразуем ответ в JSON
			.then(data => {
				const brlRate = data.Valute.BRL.Value / data.Valute.BRL.Nominal; // Рассчитываем курс BRL (делим значение на номинал)
				currentRate = brlRate; // Сохраняем курс в переменную
				currentRateValue.textContent = brlRate.toFixed(4) + ' RUB'; // Отображаем курс с 4 знаками после запятой
				
				// Форматируем дату для отображения
				const date = new Date(data.Date); 
				const options = { day: 'numeric', month: 'long', year: 'numeric' };
				rateDate.textContent = 'по состоянию на ' + date.toLocaleDateString('ru-RU', options);
				
			})
			.catch(error => { // Обработка ошибок при загрузке
				console.error('Ошибка загрузки курса:', error);
				currentRateValue.textContent = 'не удалось загрузить';
			});
	}
	
	// Загрузка исторических данных за последние 30 дней
	async function loadHistoricalRates() { // Устанавливаем диапазон дат (последние 30 дней)
		const endDate = new Date(); // 1. Создаем объект Date с текущей датой
		const startDate = new Date(); // 2. Создаем копию текущей даты
		startDate.setDate(endDate.getDate() - 30); // 3. Отнимаем 30 дней
		
		function formatDate(date) { // Вспомогательная функция для форматирования даты в компоненты
			const year = date.getFullYear(); // Получаем год из даты (4 цифры)
			const month = String(date.getMonth() + 1).padStart(2, '0'); // Получаем месяц (добавляем 1, так как месяцы нумеруются с 0), Преобразуем в строку и добавляем ведущий ноль при необходимости
			const day = String(date.getDate()).padStart(2, '0'); // Получаем день месяца с ведущим нулем
			// return `${year}-${month}-${day}`;
			return { year, month, day }; // Возвращаем объект с компонентами даты
		};

		// Получаем массив дат
		const dates = []; // Создаем пустой массив для хранения всех дат диапазона
		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) { // Цикл от начальной до конечной даты
			dates.push(new Date(d)); // Добавляем копию текущей даты в массив
		}
	
		historicalRates = []; // Очищаем массив исторических данных перед загрузкой новых
		
		for (const date of dates) { // Перебираем все даты из нашего диапазона
			const { year, month, day } = formatDate(date); // Разбираем дату на компоненты с помощью нашей функции
			const url = `https://www.cbr-xml-daily.ru/archive/${year}/${month}/${day}/daily_json.js`; // Формируем URL для запроса данных за конкретную дату

			try {
				const response = await fetch(url); // Отправляем асинхронный запрос по сформированному URL
				if (!response.ok) { // Если сервер вернул ошибку (например, 404)
					console.warn(`Данные за ${year}-${month}-${day} недоступны`); // Выводим предупреждение в консоль
					continue; // пропускаем отсутствующие даты, Переходим к следующей дате
				}
				const data = await response.json(); // Преобразуем ответ в JSON
				if (data.Valute && data.Valute.BRL) { // Проверяем, есть ли данные по BRL
					historicalRates.push({ // Добавляем данные в массив historicalRates
						date: new Date(date), // Сохраняем дату как объект Date
						rate: data.Valute.BRL.Value / data.Valute.BRL.Nominal // Вычисляем и сохраняем курс (значение / номинал)
					});
					// console.log(historicalRates)
				}
			} catch (error) {
				console.warn(`Ошибка загрузки данных за ${year}-${month}-${day}:`, error); // просто нет данных за какие-то даты, пропускаем их
				continue;
			}
		}
		
		historicalRates.sort((a, b) => a.date - b.date); // Сортируем исторические данные по дате (от старых к новым)
		renderChart(); // Вызываем функцию отрисовки графика с загруженными данными
		
		// console.log(historicalRates);
	}
	
	// Отрисовка графика
	function renderChart() {
		chartLoading.style.display = 'none'; // Скрываем индикатор загрузки (график сейчас будет рисоваться)
		chart.innerHTML = ''; // Очищаем контейнер графика от предыдущих элементов
		
		if (!historicalRates.length) { // Если нет данных для отображения
			chart.innerHTML = '<p>Нет данных для отображения</p>'; // Показываем сообщение об отсутствии данных
			return; // Выходим из функции
		}
		
		// Находим минимальное и максимальное значение курса для масштабирования
		const minRate = Math.min(...historicalRates.map(item => item.rate)); // Находим минимальное значение курса в исторических данных
		const maxRate = Math.max(...historicalRates.map(item => item.rate)); // Находим максимальное значение курса
		const range = maxRate - minRate; // Вычисляем разницу между максимальным и минимальным значением
		
		historicalRates.forEach((item, index) => { // Для каждой записи в исторических данных
			const barContainer = document.createElement('div'); // Создаем контейнер для столбца графика
			barContainer.className = 'bar-container'; // Устанавливаем класс для стилизации
			
			const barHeight = range ? ((item.rate - minRate) / range * 350) : 175; // Вычисляем высоту столбца: Если есть диапазон (range не 0), вычисляем пропорциональную высоту, Иначе устанавливаем среднюю высоту (175px)
			const bar = document.createElement('div'); // Создаем сам столбец графика
			bar.className = 'bar'; // Устанавливаем класс для стилизации
			bar.style.height = `${barHeight}px`; // Задаем вычисленную высоту
			bar.dataset.date = item.date.toLocaleDateString('ru-RU'); // Сохраняем дату в атрибуте data-date (для отображения при клике)
			bar.dataset.rate = item.rate.toFixed(4); // Сохраняем значение курса в атрибуте data-rate (округленное до 4 знаков)
			
			bar.addEventListener('click', function() { // Добавляем обработчик клика на столбец
				// Удаляем активный класс у всех столбцов
				document.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
				
				// Добавляем активный класс к текущему столбцу (для выделения)
				this.classList.add('active');
				
				chartInfo.style.display = 'block'; // Показываем блок с информацией
				// Заполняем блок информацией из атрибутов data
				chartInfo.innerHTML = `
					<strong>Дата:</strong> ${this.dataset.date}<br>
					<strong>Курс:</strong> 1 BRL = ${this.dataset.rate} RUB
				`;
			});
			
			const label = document.createElement('div'); // Создаем подпись под столбцом (дата)
			label.className = 'bar-label'; // Устанавливаем класс для стилизации
			//label.textContent = item.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
			// для формата dd.mm
			const day = String(item.date.getDate()).padStart(2, '0'); // Форматируем день месяца (две цифры, с ведущим нулем)
			const month = String(item.date.getMonth() + 1).padStart(2, '0'); // Форматируем месяц (две цифры, с ведущим нулем)
			label.textContent = `${day}.${month}`; // Устанавливаем текст подписи в формате ДД.ММ
			
			barContainer.appendChild(bar); // Добавляем столбец в его контейнер
			barContainer.appendChild(label); // Добавляем подпись в контейнер
			chart.appendChild(barContainer); // Добавляем контейнер в график
		});
	}
	
	// Переключение валют
	switchBtn.addEventListener('click', function() {
		const fromValue = fromCurrencySelect.value; // Запоминаем текущее значение первого списка
		fromCurrencySelect.value = toCurrencySelect.value; // Устанавливаем в первый список значение из второго списка
		toCurrencySelect.value = fromValue; // Устанавливаем во второй список сохраненное значение первого
	});
	
	// Расчет конвертации
	calculateBtn.addEventListener('click', function() {
		if (!currentRate) { // Проверяем, загружен ли текущий курс
			resultDiv.textContent = 'Курс не загружен, попробуйте позже';
			resultDiv.style.display = 'block'; // Делаем блок результата видимым
			return; // Выходим из функции
		}
		
		const amount = parseFloat(amountInput.value); // Пытаемся преобразовать введенное значение в число
		if (isNaN(amount)) { // Если преобразование не удалось (введено не число)
			resultDiv.textContent = 'Введите корректную сумму'; // Показываем сообщение об ошибке
			resultDiv.style.display = 'block'; // Делаем блок результата видимым
			return; // Выходим из функции
		}
		
		let result; // Переменная для результата конвертации
		if (fromCurrencySelect.value === 'RUB' && toCurrencySelect.value === 'BRL') { // Если конвертируем из RUB в BRL
			result = amount / currentRate; // Делим сумму на курс
			resultDiv.innerHTML = `<strong>${amount.toFixed(2)} RUB</strong> = <strong>${result.toFixed(4)} BRL</strong>`; // Формируем строку результата с округлением
		} else if (fromCurrencySelect.value === 'BRL' && toCurrencySelect.value === 'RUB') { // Если конвертируем из BRL в RUB
			result = amount * currentRate; // Умножаем сумму на курс
			resultDiv.innerHTML = `<strong>${amount.toFixed(2)} BRL</strong> = <strong>${result.toFixed(2)} RUB</strong>`; // Формируем строку результата с округлением
		} else { // Если выбраны одинаковые валюты
			resultDiv.textContent = 'Выберите разные валюты'; // Показываем сообщение об ошибке
		}
		
		resultDiv.style.display = 'block'; // Делаем блок результата видимым
	});
	
	// Кнопка "Наверх"
	document.querySelector('.back-to-top').addEventListener('click', function(e) {
		e.preventDefault();
		window.scrollTo({top: 0, behavior: 'smooth'});
	});
	
	// Загружаем текущий курс при загрузке страницы
	loadCurrentRate();
	// Загружаем данные за месяц
	loadHistoricalRates();
});
