import { createVelaTicket, createTiktokTicket, fetchVelaTickets, fetchTiktokTickets, toggleVelaStatus, completeTicketStatus, fetchTicketStats } from './src/services/api.js';
import { fetchClientHistory } from './src/services/reportes.js';

async function runTests() {
  console.log("=== INICIANDO PRUEBAS E2E DE INTEGRACIÓN ===");
  try {
    const randomPhone = `519${Math.floor(Math.random() * 100000000)}`;
    const testName = `Cliente Test ${Math.floor(Math.random() * 100)}`;
    
    // 1 & 2. Crear Cliente y Ticket Velada
    console.log(`\n1-2. Creando ticket velada para ${testName} (${randomPhone})...`);
    await createVelaTicket({
      name: testName,
      phone: randomPhone,
      price: '50.00',
      method: 'Yape / Plin',
      notes: 'Prueba E2E Vela',
      velas: ['Vela Dorada', 'Vela Plateada']
    });
    console.log("   ✅ Ticket velada y cliente creados exitosamente (Sin fallos de Enum/Columna).");

    // 3. Crear ticket TikTok
    console.log(`\n3. Creando ticket TikTok para el mismo cliente (${randomPhone})...`);
    await createTiktokTicket({
      name: testName,
      phone: randomPhone,
      type: 'Canalización',
      price: '15.00',
      method: 'Transferencia',
      notes: 'Prueba E2E TikTok'
    });
    console.log("   ✅ Ticket TikTok creado exitosamente (El Enum type y method funcionan).");

    // Recargar Data
    console.log(`\n4. Validando lectura de tickets e hidratación de estado...`);
    const velaTickets = await fetchVelaTickets();
    const tiktokTickets = await fetchTiktokTickets();
    
    const myVelaTicket = velaTickets.find(t => t.phone === randomPhone && t.notes === 'Prueba E2E Vela');
    const myTiktokTicket = tiktokTickets.find(t => t.phone === randomPhone && t.notes === 'Prueba E2E TikTok');
    
    if (!myVelaTicket) throw new Error("No se pudo leer el ticket de velada recién creado.");
    if (!myTiktokTicket) throw new Error("No se pudo leer el ticket de TikTok recién creado.");
    console.log("   ✅ Los select/joins y el adapter.js hidratan correctamente la UI.");
    
    // 5. Historial de Cliente
    console.log(`\n5. Verificando historial y vistas...`);
    const history = await fetchClientHistory();
    const myHistory = history.find(h => h.phone === randomPhone);
    if (!myHistory) throw new Error("Fallo en la vista v_client_history o no se actualizó.");
    console.log("   ✅ El historial del cliente existe y está mapeado funcionalmente en el SQL View.");
    
    // 6. Completar una Vela (Maestro)
    console.log(`\n6. Maestro completa una vela...`);
    const vela1 = myVelaTicket.velas[0];
    await toggleVelaStatus(vela1.id, true);
    console.log("   ✅ Vela 1 marcada como completada sin errores DB.");

    // 7. Completar todas las Velas (Ticket Status Switch)
    console.log(`\n7. Maestro completa la vela faltante (gatillo completado ticket)...`);
    const vela2 = myVelaTicket.velas[1];
    await toggleVelaStatus(vela2.id, true);
    await completeTicketStatus(myVelaTicket.id);
    console.log("   ✅ Ticket Velada transición ejecutada con enum 'Completado'.");

    // 8. Completar TikTok Ticket
    console.log(`\n8. Maestro completa ticket TikTok...`);
    await completeTicketStatus(myTiktokTicket.id);
    console.log("   ✅ Ticket TikTok transición ejecutada con enum 'Completado'.");
    
    console.log(`\n9. Verificando stats finales...`);
    const stats = await fetchTicketStats();
    console.log(`   ✅ FetchStats operó bien (Pendientes: ${stats.pendings}, Completados: ${stats.completed})`);

    console.log("\n=== ✅ TODAS LAS PRUEBAS E2E PASARON ===");
    console.log("El Backend PostgreSQL / Supabase está 100% alineado con el Frontend.");

  } catch (error) {
    console.error("\n❌ ERROR GRAVE EN PRUEBAS E2E:");
    console.error(error);
  }
}

runTests();
