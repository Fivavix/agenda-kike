import { useEffect, useRef } from 'react';

// Stack global para manejar qué componente debe reaccionar al popstate
const backHandlers = [];
let ignoreNextPop = false;

// Único listener global para el botón atrás del navegador/celular
window.addEventListener('popstate', (e) => {
  if (ignoreNextPop) {
    // Este popstate fue detonado manualmente por código (window.history.back()), 
    // lo ignoramos para no ejecutar los onBack de la app
    ignoreNextPop = false;
    return;
  }
  
  if (backHandlers.length > 0) {
    // Si hay manejadores registrados, tomamos el que está más arriba y lo ejecutamos
    const topHandler = backHandlers.pop();
    topHandler.callback();
  }
});

/**
 * useMobileBack
 * Hook robusto para manejar el botón Atrás del dispositivo móvil o navegador
 * con soporte para enrutado anidado de vistas y modales sin dejar historiales fantasmas.
 *
 * @param {boolean} isOpen - true si la vista/modal está activa y debe interceptar
 * @param {Function} onBack - función que cierra la vista localmente
 */
export function useMobileBack(isOpen, onBack) {
  const isHandlingPopRef = useRef(false);
  const onBackRef = useRef(onBack);

  // Mantenemos la referencia de onBack siempre actualizada sin disparar re-renders
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return;

    // Cuando se abre la subvista, metemos un historial garantizando que el navegador lo registre (usando un hash estático temporal)
    const hashId = `#internal-${Date.now()}`;
    window.history.pushState({ appInternal: true }, '', window.location.pathname + window.location.search + hashId);

    const handlerObj = {
      callback: () => {
        // Marcamos que esta función está respondiendo a un popstate real
        isHandlingPopRef.current = true;
        onBackRef.current();
      }
    };

    backHandlers.push(handlerObj);

    return () => {
      // Cleanup al desmontarse o cuando isOpen pasa a false
      const index = backHandlers.indexOf(handlerObj);
      if (index !== -1) {
        backHandlers.splice(index, 1);
      }

      // Si el componente se está cerrando NO por el botón atrás, sino por 
      // un botón de la propia UI ('X', '<-'), entonces tenemos que devolver 
      // el historial a como estaba antes haciendo un back() automático.
      if (!isHandlingPopRef.current) {
        ignoreNextPop = true;
        window.history.back();
        // Fallback: Si el navegador optimiza la llamada history.back() y nunca dispara el evento popstate, 
        // liberamos el candado para que el botón volver no quede inhabilitado permanentemente.
        setTimeout(() => {
          ignoreNextPop = false;
        }, 150);
      }
      
      isHandlingPopRef.current = false;
    };
  }, [isOpen]); // Quitamos onBack de las dependencias para evitar reciclar el stack en cada re-render
}
