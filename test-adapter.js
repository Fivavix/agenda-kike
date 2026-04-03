import { moduleToDB, methodToDB, statusToDB } from './src/services/adapter.js';

console.log("=== INICIANDO VALIDACIÓN DE ADAPTADORES ===");

let fallos = 0;

// Validar módulos
if (moduleToDB('La Velada') !== 'velada') fallos++;
if (moduleToDB('Consultas TikTok') !== 'tiktok') fallos++;

// Validar métodos
if (methodToDB('Yape / Plin') !== 'yape_plin') fallos++;
if (methodToDB('Transferencia') !== 'transferencia') fallos++;
if (methodToDB('PayPal') !== 'paypal') fallos++;
if (methodToDB('Western Union') !== 'western_union') fallos++;
if (methodToDB('Objetivo') !== 'objetivo') fallos++;

// Validar Status
if (statusToDB('Pendiente') !== 'pendiente') fallos++;
if (statusToDB('Completado') !== 'completado') fallos++;

if (fallos === 0) {
  console.log("✅ TODAS LAS TRADUCCIONES UIs -> ENUMS PostgreSQL ESTÁN OPERANDO AL 100%");
  console.log("Los insert a BD ahora usan siempre 'velada', 'tiktok', 'yape_plin', 'pendiente', etc.");
} else {
  console.error(`❌ Faltaron ${fallos} mapeos. Revisar adapter.`);
}
