// backend básico en Express (Node.js)
// archivo: web/index.js

import express from 'express';
import fs from 'fs';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const CAMPAIGNS_FILE = './data/campaigns.json';
const TRANSACTIONS_FILE = './data/transactions.json';

// Helpers
const readJson = (path) => {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
};

const writeJson = (path, data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

// GET: Listar campañas activas
app.get('/api/campaigns', (req, res) => {
  const campaigns = readJson(CAMPAIGNS_FILE);
  res.json(campaigns);
});

// POST: Crear nueva campaña
app.post('/api/campaigns', (req, res) => {
  const { nombre, productos, presupuestoInicial, descuentos } = req.body;
  if (!nombre || !productos || !presupuestoInicial || !descuentos) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const campaigns = readJson(CAMPAIGNS_FILE);
  const newCampaign = {
    id: uuidv4(),
    nombre,
    productos,
    presupuestoInicial,
    presupuestoRestante: presupuestoInicial,
    descuentos
  };
  campaigns.push(newCampaign);
  writeJson(CAMPAIGNS_FILE, campaigns);

  res.status(201).json(newCampaign);
});

// POST: Registrar transacción
  app.post('/api/transactions', (req, res) => {
  const { order_id, region, productos } = req.body;
  if (!order_id || !region || !productos) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  console.log('🛒 Recibida transacción:', req.body); // 👈 AGREGA ESTA LÍNEA


  const campaigns = readJson(CAMPAIGNS_FILE);
  const transactions = readJson(TRANSACTIONS_FILE);
  const now = new Date().toISOString();

  let campañasAplicadas = [];

  productos.forEach(pid => {
    const campaign = campaigns.find(c => c.productos.includes(pid));
    if (campaign && campaign.presupuestoRestante > 0) {
      const descuento = campaign.descuentos[region] || campaign.descuentos.global || 0;

      if (campaign.presupuestoRestante >= descuento) {
        campaign.presupuestoRestante -= descuento;
        campañasAplicadas.push({ id: campaign.id, descuento });
      }
    }
  });

  writeJson(CAMPAIGNS_FILE, campaigns);
  transactions.push({ order_id, fecha: now, region, productos, campañas: campañasAplicadas });
  writeJson(TRANSACTIONS_FILE, transactions);

  res.status(200).json({ success: true, campañasAplicadas });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
