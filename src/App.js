import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line, Radar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	RadialLinearScale,
	PointElement,
	LineElement,
	Filler,
	Tooltip,
	Legend,
	CategoryScale,
	LinearScale,
} from "chart.js";
import {
	isSameDay,
	format,
	setHours,
	setMinutes,
	startOfHour,
	startOfMinute,
	addMinutes,
	addHours,
	differenceInMinutes,
	isWithinInterval,
} from "date-fns";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
	FaTemperatureHigh,
	FaTint,
	FaCloud,
	FaSmog,
	FaGasPump,
	FaClock,
	FaChartLine,
	FaExclamationTriangle,
	FaFileDownload,
	FaCheckCircle,
} from "react-icons/fa";
import { Range } from "react-range";

// Регистрация компонентов Chart.js
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

const API_URL = "http://localhost:5154"; // Замените на реальный URL API, например, http://192.168.1.100:5000

// Пороговые значения для критичных моментов
const THRESHOLDS = {
	co2Ppm: 1000,
	nh3Ppm: 50,
	benzenePpm: 0.1,
	lpgPpm: 1000,
	coPpm: 9,
};

// Компонент авторизации
const LoginModal = ({ isOpen, onClose, onLogin }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleLogin = async () => {
		try {
			const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
			onLogin(response.data.token);
			onClose();
		} catch (err) {
			setError("Қате деректер");
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
			<div className='bg-white p-6 rounded-lg shadow-xl'>
				<h2 className='text-xl font-bold mb-4 flex items-center'>
					<FaCheckCircle className='mr-2 text-blue-500' /> Кіру
				</h2>
				{error && <p className='text-red-500 mb-4'>{error}</p>}
				<input
					type='email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder='Электрондық пошта'
					className='w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
				/>
				<input
					type='password'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder='Құпия сөз'
					className='w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
				/>
				<div className='flex justify-end'>
					<button onClick={onClose} className='mr-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition'>
						Болдырмау
					</button>
					<button
						onClick={handleLogin}
						className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition'>
						Кіру
					</button>
				</div>
			</div>
		</div>
	);
};

// Основной компонент
const App = () => {
	const [data, setData] = useState([]);
	const [latestData, setLatestData] = useState(null);
	const [criticalEvents, setCriticalEvents] = useState([]);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [timeRange, setTimeRange] = useState([0, 1439]); // [startTime, endTime] в минутах
	const [chartElements, setChartElements] = useState({
		co2Ppm: true,
		nh3Ppm: true,
		benzenePpm: true,
		lpgPpm: true,
		coPpm: true,
	});
	const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
	const [showLogin, setShowLogin] = useState(false);
	const [chartType, setChartType] = useState("radar");

	// Загрузка данных
	const fetchData = async () => {
		try {
			const response = await axios.get(`${API_URL}/api/AirQuality`, {
				headers: isAuthenticated ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {},
			});

			// Локальная фильтрация по дате и времени
			const startDateTime = setHours(setMinutes(selectedDate, timeRange[0] % 60), Math.floor(timeRange[0] / 60));
			const endDateTime = setHours(setMinutes(selectedDate, timeRange[1] % 60), Math.floor(timeRange[1] / 60));

			const filteredData = response.data.filter((item) => {
				const itemDate = new Date(item.timestamp);
				return (
					isSameDay(itemDate, selectedDate) && isWithinInterval(itemDate, { start: startDateTime, end: endDateTime })
				);
			});
			setData(filteredData);

			// Последние данные
			const sortedData = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
			setLatestData(sortedData[0]);

			// Критичные моменты
			const critical = response.data.filter(
				(item) =>
					item.co2Ppm > THRESHOLDS.co2Ppm ||
					item.nh3Ppm > THRESHOLDS.nh3Ppm ||
					item.benzenePpm > THRESHOLDS.benzenePpm ||
					item.lpgPpm > THRESHOLDS.lpgPpm ||
					item.coPpm > THRESHOLDS.coPpm
			);
			setCriticalEvents(critical);
		} catch (err) {
			console.error("Деректерді алу қатесі:", err);
		}
	};

	useEffect(() => {
		fetchData();
	}, [selectedDate, timeRange, isAuthenticated]);

	// Обработка логина
	const handleLogin = (token) => {
		localStorage.setItem("token", token);
		setIsAuthenticated(true);
		axios
			.post(
				`${API_URL}/api/notifications/subscribe`,
				{ email: "user@example.com" },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.catch((err) => console.error("Хабарландыруларға жазылу қатесі:", err));
		setShowLogin(false);
	};

	// Выход
	const handleLogout = () => {
		localStorage.removeItem("token");
		setIsAuthenticated(false);
	};

	// Экспорт данных в CSV
	const exportToCSV = () => {
		const csv = criticalEvents.map((event) => ({
			Уақыт: new Date(event.timestamp).toLocaleString(),
			CO2: event.co2Ppm,
			NH3: event.nh3Ppm,
			Бензол: event.benzenePpm,
			LPG: event.lpgPpm,
			CO: event.coPpm,
		}));
		const csvContent =
			"data:text/csv;charset=utf-8," +
			[Object.keys(csv[0]).join(","), ...csv.map((row) => Object.values(row).join(","))].join("\n");
		const link = document.createElement("a");
		link.setAttribute("href", encodeURI(csvContent));
		link.setAttribute("download", "критикалык_окуялар.csv");
		link.click();
	};

	// Агрегация данных для линейного графика
	const aggregateData = () => {
		const timeRangeMinutes = timeRange[1] - timeRange[0];
		if (timeRangeMinutes <= 30) {
			return data; // Без агрегации для < 30 минут
		}

		const aggregated = [];
		let intervalMinutes;
		if (timeRangeMinutes > 12 * 60) {
			intervalMinutes = 60; // Каждый час
		} else if (timeRangeMinutes > 4 * 60) {
			intervalMinutes = 30; // Каждые 30 минут
		} else if (timeRangeMinutes > 60) {
			intervalMinutes = 10; // Каждые 10 минут
		} else {
			intervalMinutes = 1; // Каждая минута
		}

		const startDateTime = setHours(setMinutes(selectedDate, timeRange[0] % 60), Math.floor(timeRange[0] / 60));
		let currentTime = intervalMinutes >= 60 ? startOfHour(startDateTime) : startOfMinute(startDateTime);
		const endDateTime = setHours(setMinutes(selectedDate, timeRange[1] % 60), Math.floor(timeRange[1] / 60));

		while (currentTime < endDateTime) {
			const nextTime = intervalMinutes >= 60 ? addHours(currentTime, 1) : addMinutes(currentTime, intervalMinutes);

			const intervalData = data.filter((item) => {
				const itemDate = new Date(item.timestamp);
				return itemDate >= currentTime && itemDate < nextTime;
			});

			if (intervalData.length > 0) {
				const avgData = {
					timestamp: format(currentTime, intervalMinutes >= 60 ? "HH:00" : "HH:mm"),
					co2Ppm: intervalData.reduce((sum, item) => sum + item.co2Ppm, 0) / intervalData.length,
					nh3Ppm: intervalData.reduce((sum, item) => sum + item.nh3Ppm, 0) / intervalData.length,
					benzenePpm: intervalData.reduce((sum, item) => sum + item.benzenePpm, 0) / intervalData.length,
					lpgPpm: intervalData.reduce((sum, item) => sum + item.lpgPpm, 0) / intervalData.length,
					coPpm: intervalData.reduce((sum, item) => sum + item.coPpm, 0) / intervalData.length,
				};
				aggregated.push(avgData);
			}

			currentTime = nextTime;
		}

		console.log("Aggregated Data:", aggregated); // Для отладки
		return aggregated;
	};

	// Статус качества воздуха
	const getAirQualityStatus = () => {
		if (!latestData) {
			return { status: "Белгісіз", color: "gray", description: "Деректер жоқ" };
		}

		let exceedances = 0;
		if (latestData.co2Ppm > THRESHOLDS.co2Ppm) exceedances++;
		if (latestData.nh3Ppm > THRESHOLDS.nh3Ppm) exceedances++;
		if (latestData.benzenePpm > THRESHOLDS.benzenePpm) exceedances++;
		if (latestData.lpgPpm > THRESHOLDS.lpgPpm) exceedances++;
		if (latestData.coPpm > THRESHOLDS.coPpm) exceedances++;

		if (exceedances === 0) {
			return {
				status: "Жақсы",
				color: "green",
				description: "Ауа сапасы қауіпсіз және денсаулыққа зиянсыз.",
			};
		} else if (exceedances <= 2) {
			return {
				status: "Қанағаттанарлық",
				color: "yellow",
				description: "Ауа сапасы орташа, сезімтал адамдар үшін аздаған қауіп бар.",
			};
		} else {
			return {
				status: "Нашар",
				color: "red",
				description: "Ауа сапасы нашар, денсаулыққа қауіпті болуы мүмкін.",
			};
		}
	};

	const airQualityStatus = getAirQualityStatus();

	// Динамическое максимальное значение для дугового графика
	const radarMaxValue = latestData
		? Math.max(
				chartElements.co2Ppm ? latestData.co2Ppm : 0,
				chartElements.nh3Ppm ? latestData.nh3Ppm : 0,
				chartElements.benzenePpm ? latestData.benzenePpm : 0,
				chartElements.lpgPpm ? latestData.lpgPpm : 0,
				chartElements.coPpm ? latestData.coPpm : 0
		  ) * 1.2 || 100
		: 100;

	const radarStepSize = radarMaxValue / 5;

	// Данные для дугового графика
	const radarChartData = {
		labels: ["CO2", "NH3", "Бензол", "LPG", "CO"],
		datasets: [
			{
				label: "Ауа сапасы",
				data: [
					latestData && chartElements.co2Ppm ? latestData.co2Ppm : 0,
					latestData && chartElements.nh3Ppm ? latestData.nh3Ppm : 0,
					latestData && chartElements.benzenePpm ? latestData.benzenePpm : 0,
					latestData && chartElements.lpgPpm ? latestData.lpgPpm : 0,
					latestData && chartElements.coPpm ? latestData.coPpm : 0,
				],
				backgroundColor: "rgba(54, 162, 235, 0.2)",
				borderColor: "rgba(54, 162, 235, 1)",
				borderWidth: 1,
			},
		],
	};

	// Данные для линейного графика
	const aggregatedData = aggregateData();
	const lineChartData = {
		labels: aggregatedData.map((item) => item.timestamp),
		datasets: Object.keys(chartElements)
			.filter((key) => chartElements[key])
			.map((key) => ({
				label:
					key === "co2Ppm"
						? "CO2"
						: key === "nh3Ppm"
						? "NH3"
						: key === "benzenePpm"
						? "Бензол"
						: key === "lpgPpm"
						? "LPG"
						: "CO",
				data: aggregatedData.map((item) => item[key]),
				borderColor: {
					co2Ppm: "rgba(255, 99, 132, 1)",
					nh3Ppm: "rgba(54, 162, 235, 1)",
					benzenePpm: "rgba(255, 206, 86, 1)",
					lpgPpm: "rgba(75, 192, 192, 1)",
					coPpm: "rgba(153, 102, 255, 1)",
				}[key],
				fill: false,
				tension: 0.4,
			})),
	};

	// Опции для графиков
	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 1000,
			easing: "easeInOutQuad",
		},
		scales:
			chartType === "radar"
				? {
						r: {
							beginAtZero: true,
							max: radarMaxValue,
							ticks: {
								stepSize: radarStepSize,
							},
						},
				  }
				: {
						x: {
							type: "category",
							title: {
								display: true,
								text: "Уақыт",
							},
						},
						y: {
							beginAtZero: true,
							title: {
								display: true,
								text: "Концентрация (ppm)",
							},
						},
				  },
	};

	// Форматирование времени для отображения
	const formatTime = (minutes) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
	};

	return (
		<div className='min-h-screen bg-gray-100'>
			{/* Шапка */}
			<header className='bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 shadow-md'>
				<div className='container mx-auto flex justify-between items-center'>
					<h1 className='text-2xl font-bold flex items-center'>
						<FaChartLine className='mr-2' /> Ауа сапасы бақылау тақтасы
					</h1>
					<div>
						{isAuthenticated ? (
							<button
								onClick={handleLogout}
								className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center'>
								<FaExclamationTriangle className='mr-2' /> Шығу
							</button>
						) : (
							<button
								onClick={() => setShowLogin(true)}
								className='px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-200 transition flex items-center'>
								<FaCheckCircle className='mr-2' /> Кіру
							</button>
						)}
					</div>
				</div>
			</header>

			<LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />

			{/* Основной контент */}
			<div className='container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4'>
				{/* Левая панель: Закреплена только на десктопе */}
				<div className='lg:col-span-1 space-y-4 lg:sticky lg:top-4'>
					{/* Календарь */}
					<div className='bg-white p-4 rounded-lg shadow-md'>
						<h2 className='text-lg font-semibold mb-2 flex items-center justify-center'>
							<FaClock className='mr-2 text-blue-500' /> Күнді таңдау
						</h2>
						<div className='mx-auto max-w-xs'>
							<Calendar onChange={setSelectedDate} value={selectedDate} className='border-none rounded-lg w-full' />
						</div>
						{/* Ползунок времени */}
						<div className='mt-4'>
							<label className='text-gray-700 flex items-center mb-2'>
								<FaClock className='mr-2 text-blue-500' /> Уақыт аралығы
							</label>
							<p className='text-gray-700 mb-2'>
								Таңдалған: {formatTime(timeRange[0])}–{formatTime(timeRange[1])}
							</p>
							<Range
								step={15}
								min={0}
								max={1439}
								values={timeRange}
								onChange={(values) => setTimeRange(values)}
								renderTrack={({ props, children }) => (
									<div {...props} className='h-2 w-full bg-gray-200 rounded-lg' style={{ ...props.style }}>
										<div
											className='h-2 bg-blue-500 rounded-lg'
											style={{
												position: "absolute",
												left: `${(timeRange[0] / 1439) * 100}%`,
												width: `${((timeRange[1] - timeRange[0]) / 1439) * 100}%`,
											}}
										/>
										{children}
									</div>
								)}
								renderThumb={({ props, index }) => (
									<div
										{...props}
										className='h-4 w-4 bg-blue-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500'
										style={{ ...props.style }}
									/>
								)}
							/>
						</div>
					</div>

					{/* Последние данные */}
					<div className='bg-white p-4 rounded-lg shadow-md'>
						<h2 className='text-lg font-semibold mb-2 flex items-center'>
							<FaTemperatureHigh className='mr-2 text-blue-500' /> Соңғы деректер
						</h2>
						{latestData ? (
							<div className='space-y-2'>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaTemperatureHigh className='mr-2 text-blue-500' /> Температура
									</span>
									<span className='font-medium'>{latestData.temperature} °C</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaTint className='mr-2 text-blue-500' /> Ылғалдылық
									</span>
									<span className='font-medium'>{latestData.humidity} %</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaCloud className='mr-2 text-red-500' /> CO2
									</span>
									<span className='font-medium'>{latestData.co2Ppm} ppm</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaSmog className='mr-2 text-blue-500' /> NH3
									</span>
									<span className='font-medium'>{latestData.nh3Ppm} ppm</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaSmog className='mr-2 text-yellow-500' /> Бензол
									</span>
									<span className='font-medium'>{latestData.benzenePpm} ppm</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaGasPump className='mr-2 text-green-500' /> LPG
									</span>
									<span className='font-medium'>{latestData.lpgPpm} ppm</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaSmog className='mr-2 text-purple-500' /> CO
									</span>
									<span className='font-medium'>{latestData.coPpm} ppm</span>
								</p>
								<p className='text-gray-700 flex justify-between items-center'>
									<span className='flex items-center'>
										<FaClock className='mr-2 text-blue-500' /> Уақыт
									</span>
									<span className='font-medium'>{new Date(latestData.timestamp).toLocaleString()}</span>
								</p>
							</div>
						) : (
							<p className='text-gray-500'>Деректер жоқ</p>
						)}
					</div>

					{/* Статус качества воздуха */}
					<div className='bg-white p-4 rounded-lg shadow-md'>
						<h2 className='text-lg font-semibold mb-2 flex items-center'>
							<FaCloud className='mr-2 text-blue-500' /> Ауа сапасының күйі
						</h2>
						<div className={`p-4 rounded-lg bg-${airQualityStatus.color}-100 text-${airQualityStatus.color}-800`}>
							<p className='text-lg font-bold flex items-center'>
								<FaCloud className='mr-2' /> {airQualityStatus.status}
							</p>
							<p className='mt-2'>{airQualityStatus.description}</p>
						</div>
					</div>
				</div>

				{/* Правая панель: График и критичные моменты */}
				<div className='lg:col-span-2 space-y-4'>
					{/* График с фильтрами */}
					<div className='bg-white p-4 rounded-lg shadow-md animate-fade-in'>
						<h2 className='text-lg font-semibold mb-2 flex items-center'>
							<FaChartLine className='mr-2 text-blue-500' /> Ауа сапасы графигі
						</h2>
						{/* Переключатель типа графика */}
						<div className='flex gap-4 mb-4'>
							<button
								onClick={() => setChartType("radar")}
								className={`px-4 py-2 rounded-lg ${
									chartType === "radar" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
								} hover:bg-blue-600 hover:text-white transition`}>
								Дөңгелек график
							</button>
							<button
								onClick={() => setChartType("line")}
								className={`px-4 py-2 rounded-lg ${
									chartType === "line" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
								} hover:bg-blue-600 hover:text-white transition`}>
								Сызықтық график
							</button>
						</div>
						{/* Фильтры графика */}
						<div className='flex flex-wrap gap-4 mb-4'>
							{Object.keys(chartElements).map((key) => (
								<label key={key} className='flex items-center'>
									<input
										type='checkbox'
										checked={chartElements[key]}
										onChange={() => setChartElements({ ...chartElements, [key]: !chartElements[key] })}
										className='mr-2'
									/>
									<span className='text-gray-700 flex items-center'>
										{key === "co2Ppm" && <FaCloud className='mr-1 text-red-500' />}
										{key === "nh3Ppm" && <FaSmog className='mr-1 text-blue-500' />}
										{key === "benzenePpm" && <FaSmog className='mr-1 text-yellow-500' />}
										{key === "lpgPpm" && <FaGasPump className='mr-1 text-green-500' />}
										{key === "coPpm" && <FaSmog className='mr-1 text-purple-500' />}
										{key === "co2Ppm"
											? "CO2"
											: key === "nh3Ppm"
											? "NH3"
											: key === "benzenePpm"
											? "Бензол"
											: key === "lpgPpm"
											? "LPG"
											: "CO"}
									</span>
								</label>
							))}
						</div>
						<div className='h-96 w-full'>
							{chartType === "radar" ? (
								<Radar data={radarChartData} options={chartOptions} />
							) : (
								<Line data={lineChartData} options={chartOptions} />
							)}
						</div>
					</div>

					{/* Критичные моменты */}
					<div className='bg-white p-4 rounded-lg shadow-md'>
						<div className='flex justify-between items-center mb-2'>
							<h2 className='text-lg font-semibold flex items-center'>
								<FaExclamationTriangle className='mr-2 text-red-500' /> Критикалық оқиғалар
							</h2>
							{criticalEvents.length > 0 && (
								<button
									onClick={exportToCSV}
									className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center'>
									<FaFileDownload className='mr-2' /> CSV-ге экспорттау
								</button>
							)}
						</div>
						{criticalEvents.length > 0 ? (
							<div className='overflow-x-auto'>
								<table className='w-full table-auto'>
									<thead>
										<tr className='bg-gray-200'>
											<th className='p-2 text-left'>Уақыт</th>
											<th className='p-2 text-left'>CO2 (ppm)</th>
											<th className='p-2 text-left'>NH3 (ppm)</th>
											<th className='p-2 text-left'>Бензол (ppm)</th>
											<th className='p-2 text-left'>LPG (ppm)</th>
											<th className='p-2 text-left'>CO (ppm)</th>
										</tr>
									</thead>
									<tbody>
										{criticalEvents.map((event) => (
											<tr key={event.id} className='border-t hover:bg-gray-50 transition'>
												<td className='p-2'>{new Date(event.timestamp).toLocaleString()}</td>
												<td
													className={`p-2 flex items-center ${event.co2Ppm > THRESHOLDS.co2Ppm ? "text-red-500" : ""}`}>
													<FaCloud className='mr-1 text-red-500' /> {event.co2Ppm}
												</td>
												<td
													className={`p-2 flex items-center ${event.nh3Ppm > THRESHOLDS.nh3Ppm ? "text-red-500" : ""}`}>
													<FaSmog className='mr-1 text-blue-500' /> {event.nh3Ppm}
												</td>
												<td
													className={`p-2 flex items-center ${
														event.benzenePpm > THRESHOLDS.benzenePpm ? "text-red-500" : ""
													}`}>
													<FaSmog className='mr-1 text-yellow-500' /> {event.benzenePpm}
												</td>
												<td
													className={`p-2 flex items-center ${event.lpgPpm > THRESHOLDS.lpgPpm ? "text-red-500" : ""}`}>
													<FaGasPump className='mr-1 text-green-500' /> {event.lpgPpm}
												</td>
												<td className={`p-2 flex items-center ${event.coPpm > THRESHOLDS.coPpm ? "text-red-500" : ""}`}>
													<FaSmog className='mr-1 text-purple-500' /> {event.coPpm}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className='text-gray-500'>Критикалық оқиғалар жоқ</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default App;
