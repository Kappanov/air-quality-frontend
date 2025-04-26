import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Table, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Thermometer, Droplet, CloudFog2, Wind, Flame, Gas } from 'react-bootstrap-icons';
import './App.css';

const App = () => {
  const [airQualityData, setAirQualityData] = useState([]);
  const [formData, setFormData] = useState({
    temperature: '',
    humidity: '',
    co2_ppm: '',
    nh3_ppm: '',
    benzene_ppm: '',
    lpg_ppm: '',
    co_ppm: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Функция для получения данных
  const fetchAirQualityData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5154/api/airquality');
      setAirQualityData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch air quality data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка данных при монтировании и автообновление каждые 10 секунд
  useEffect(() => {
    fetchAirQualityData();
    const interval = setInterval(fetchAirQualityData, 10000); // Обновление каждые 10 секунд
    return () => clearInterval(interval); // Очистка интервала при размонтировании
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        temperature: parseFloat(formData.temperature),
        humidity: parseFloat(formData.humidity),
        co2_ppm: parseFloat(formData.co2_ppm),
        nh3_ppm: parseFloat(formData.nh3_ppm),
        benzene_ppm: parseFloat(formData.benzene_ppm),
        lpg_ppm: parseFloat(formData.lpg_ppm),
        co_ppm: parseFloat(formData.co_ppm)
      };

      await axios.post('http://localhost:5154/api/airquality', payload);
      setSuccess('Data submitted successfully!');
      setError(null);
      setFormData({
        temperature: '',
        humidity: '',
        co2_ppm: '',
        nh3_ppm: '',
        benzene_ppm: '',
        lpg_ppm: '',
        co_ppm: ''
      });
      fetchAirQualityData();
    } catch (err) {
      setError('Failed to submit data');
      setSuccess(null);
      console.error(err);
    }
  };

  return (
    <Container className="mt-5">
      <h1 className="text-center mb-4">Air Quality Monitoring</h1>

      {/* Форма для отправки новых данных */}
      <Row className="mb-4">
        <Col md={{ span: 6, offset: 3 }}>
          <div className="form-card">
            <h3 className="text-center mb-4">Submit Air Quality Data</h3>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Thermometer className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">Temperature (°C)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Droplet className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">Humidity (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="humidity"
                  value={formData.humidity}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <CloudFog2 className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">CO2 (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="co2_ppm"
                  value={formData.co2_ppm}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Wind className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">NH3 (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="nh3_ppm"
                  value={formData.nh3_ppm}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Flame className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">Benzene (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="benzene_ppm"
                  value={formData.benzene_ppm}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Gas className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">LPG (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="lpg_ppm"
                  value={formData.lpg_ppm}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3 d-flex align-items-center">
                <Gas className="me-2" size={20} color="#3f51b5" />
                <Form.Label className="me-2">CO (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  name="co_ppm"
                  value={formData.co_ppm}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <div className="text-center">
                <Button variant="primary" type="submit">
                  Submit
                </Button>
              </div>
            </Form>
          </div>
        </Col>
      </Row>

      {/* Таблица для отображения данных */}
      <Row>
        <Col>
          <div className="table-card">
            <h3 className="text-center mb-4">Air Quality Data</h3>
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" variant="primary" />
                <p>Loading data...</p>
              </div>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Temperature (°C)</th>
                    <th>Humidity (%)</th>
                    <th>CO2 (ppm)</th>
                    <th>NH3 (ppm)</th>
                    <th>Benzene (ppm)</th>
                    <th>LPG (ppm)</th>
                    <th>CO (ppm)</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {airQualityData.map((data) => (
                    <tr key={data.id}>
                      <td>{data.id}</td>
                      <td>{data.temperature}</td>
                      <td>{data.humidity}</td>
                      <td>{data.co2_ppm}</td>
                      <td>{data.nh3_ppm}</td>
                      <td>{data.benzene_ppm}</td>
                      <td>{data.lpg_ppm}</td>
                      <td>{data.co_ppm}</td>
                      <td>{new Date(data.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default App;