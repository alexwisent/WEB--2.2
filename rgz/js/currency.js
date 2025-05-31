document.addEventListener('DOMContentLoaded', function() {
	// Элементы интерфейса
	const amountInput = document.getElementById('amount');
	const fromCurrencySelect = document.getElementById('fromCurrency');
	const toCurrencySelect = document.getElementById('toCurrency');
	const switchBtn = document.getElementById('switchCurrencies');
	const calculateBtn = document.getElementById('calculate');
	const resultDiv = document.getElementById('result');
	const currentRateValue = document.getElementById('currentRateValue');
	const rateDate = document.getElementById('rateDate');
	const chart = document.getElementById('chart');
	const chartInfo = document.getElementById('chartInfo');
	const chartLoading = document.getElementById('chartLoading');
	
	// Текущий курс BRL
	let currentRate = 0;
	let historicalRates = [];
	
	// Загрузка текущего курса
	function loadCurrentRate() {
		fetch('https://www.cbr-xml-daily.ru/daily_json.js')
			.then(response => response.json())
			.then(data => {
				const brlRate = data.Valute.BRL.Value / data.Valute.BRL.Nominal;
				currentRate = brlRate;
				currentRateValue.textContent = brlRate.toFixed(4) + ' RUB';
				
				// Форматируем дату
				const date = new Date(data.Date);
				const options = { day: 'numeric', month: 'long', year: 'numeric' };
				rateDate.textContent = 'по состоянию на ' + date.toLocaleDateString('ru-RU', options);
				
			})
			.catch(error => {
				console.error('Ошибка загрузки курса:', error);
				currentRateValue.textContent = 'не удалось загрузить';
			});
	}
	
	// Загрузка исторических данных за последние 30 дней
	async function loadHistoricalRates() {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - 30);
		
		function formatDate(date) {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			// return `${year}-${month}-${day}`;
			return { year, month, day };
		};

		// Получаем массив дат
		const dates = [];
		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			dates.push(new Date(d));
		}
	
		historicalRates = []; // массив для курсов очищаем
		
		for (const date of dates) {
			const { year, month, day } = formatDate(date);
			const url = `https://www.cbr-xml-daily.ru/archive/${year}/${month}/${day}/daily_json.js`;

			try {
				const response = await fetch(url);
				if (!response.ok) {
					console.warn(`Данные за ${year}-${month}-${day} недоступны`);
					continue; // пропускаем отсутствующие даты
				}
				const data = await response.json();
				if (data.Valute && data.Valute.BRL) {
					historicalRates.push({
						date: new Date(date),
						rate: data.Valute.BRL.Value / data.Valute.BRL.Nominal
					});
					// console.log(historicalRates)
				}
			} catch (error) {
				console.warn(`Ошибка загрузки данных за ${year}-${month}-${day}:`, error); // просто нет данных за какие-то даты, пропускаем их
				continue;
			}
		}
		
		// Сортируем по дате
		historicalRates.sort((a, b) => a.date - b.date);
		renderChart();
		
		// console.log(historicalRates);

	}
	
	// Отрисовка графика
	function renderChart() {
		chartLoading.style.display = 'none';
		chart.innerHTML = '';
		
		if (!historicalRates.length) {
			chart.innerHTML = '<p>Нет данных для отображения</p>';
			return;
		}
		
		// Находим минимальное и максимальное значение курса для масштабирования
		const minRate = Math.min(...historicalRates.map(item => item.rate));
		const maxRate = Math.max(...historicalRates.map(item => item.rate));
		const range = maxRate - minRate;
		
		historicalRates.forEach((item, index) => {
			const barContainer = document.createElement('div');
			barContainer.className = 'bar-container';
			
			const barHeight = range ? ((item.rate - minRate) / range * 350) : 175;
			const bar = document.createElement('div');
			bar.className = 'bar';
			bar.style.height = `${barHeight}px`;
			bar.dataset.date = item.date.toLocaleDateString('ru-RU');
			bar.dataset.rate = item.rate.toFixed(4);
			
			bar.addEventListener('click', function() {
				// Удаляем активный класс у всех столбцов
				document.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
				
				// Добавляем активный класс к текущему столбцу
				this.classList.add('active');
				
				// Показываем информацию о курсе
				chartInfo.style.display = 'block';
				chartInfo.innerHTML = `
					<strong>Дата:</strong> ${this.dataset.date}<br>
					<strong>Курс:</strong> 1 BRL = ${this.dataset.rate} RUB
				`;
			});
			
			const label = document.createElement('div');
			label.className = 'bar-label';
			//label.textContent = item.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
			// для формата dd.mm
			const day = String(item.date.getDate()).padStart(2, '0');
			const month = String(item.date.getMonth() + 1).padStart(2, '0');
			label.textContent = `${day}.${month}`;
			
			barContainer.appendChild(bar);
			barContainer.appendChild(label);
			chart.appendChild(barContainer);
		});
	}
	
	// Переключение валют
	switchBtn.addEventListener('click', function() {
		const fromValue = fromCurrencySelect.value;
		fromCurrencySelect.value = toCurrencySelect.value;
		toCurrencySelect.value = fromValue;
	});
	
	// Расчет конвертации
	calculateBtn.addEventListener('click', function() {
		if (!currentRate) {
			resultDiv.textContent = 'Курс не загружен, попробуйте позже';
			resultDiv.style.display = 'block';
			return;
		}
		
		const amount = parseFloat(amountInput.value);
		if (isNaN(amount)) {
			resultDiv.textContent = 'Введите корректную сумму';
			resultDiv.style.display = 'block';
			return;
		}
		
		let result;
		if (fromCurrencySelect.value === 'RUB' && toCurrencySelect.value === 'BRL') {
			result = amount / currentRate;
			resultDiv.innerHTML = `<strong>${amount.toFixed(2)} RUB</strong> = <strong>${result.toFixed(4)} BRL</strong>`;
		} else if (fromCurrencySelect.value === 'BRL' && toCurrencySelect.value === 'RUB') {
			result = amount * currentRate;
			resultDiv.innerHTML = `<strong>${amount.toFixed(2)} BRL</strong> = <strong>${result.toFixed(2)} RUB</strong>`;
		} else {
			resultDiv.textContent = 'Выберите разные валюты';
		}
		
		resultDiv.style.display = 'block';
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
