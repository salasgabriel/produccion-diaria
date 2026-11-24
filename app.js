/* =====================================================
 * PRODUCCIÓN DIARIA - Químicos La Bella
 * Base de datos: Supabase (proyecto quimicos-la-bella-db)
 * ===================================================== */

/* ---------- FORMATEO NUMÉRICO LATINO (. miles / , decimales) ---------- */
function formatearNumeroLatino(valorNumerico, decimales = 2) {
    if (valorNumerico === null || valorNumerico === undefined || isNaN(valorNumerico)) return "0,00";
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valorNumerico);
}

/* ---------- FÓRMULAS (KG POR BLOQUE) ---------- */
const FORMULAS = {
    "240": {
        "10 kg":     { "AGUA": 2.200, "SILICONA": 0.500, "GLISERINA": 0.100, "AMINA": 0.042, "T.9": 0.175, "TDI": 28.400, "CLORURO": 8.300, "POLIOL": 36.000, "COPOLIMERICO": 0.000 },
        "12 kg":     { "AGUA": 2.280, "SILICONA": 0.540, "GLISERINA": 0.100, "AMINA": 0.050, "T.9": 0.195, "TDI": 30.700, "CLORURO": 6.300, "POLIOL": 38.000, "COPOLIMERICO": 4.000 },
        "16 kg":     { "AGUA": 2.810, "SILICONA": 0.600, "GLISERINA": 0.100, "AMINA": 0.072, "T.9": 0.150, "TDI": 36.300, "CLORURO": 3.700, "POLIOL": 45.000, "COPOLIMERICO": 8.000 },
        "21 kg":     { "AGUA": 3.210, "SILICONA": 0.800, "GLISERINA": 0.100, "AMINA": 0.110, "T.9": 0.180, "TDI": 41.600, "CLORURO": 1.000, "POLIOL": 65.000, "COPOLIMERICO": 8.000 },
        "24 kg":     { "AGUA": 3.440, "SILICONA": 0.800, "GLISERINA": 0.100, "AMINA": 0.150, "T.9": 0.170, "TDI": 46.500, "CLORURO": 0.000, "POLIOL": 77.400, "COPOLIMERICO": 9.000 },
        "28 kg":     { "AGUA": 3.600, "SILICONA": 1.000, "GLISERINA": 0.120, "AMINA": 0.210, "T.9": 0.200, "TDI": 49.400, "CLORURO": 0.000, "POLIOL": 90.000, "COPOLIMERICO": 10.000 },
        "CILINDRO":  { "AGUA": 2.800, "SILICONA": 0.900, "GLISERINA": 0.150, "AMINA": 0.078, "T.9": 0.155, "TDI": 38.000, "CLORURO": 3.200, "POLIOL": 60.000, "COPOLIMERICO": 0.000 }
    },
    "280": {
        "10 kg":     { "AGUA": 2.440, "SILICONA": 0.560, "GLISERINA": 0.100, "AMINA": 0.048, "T.9": 0.195, "TDI": 31.400, "CLORURO": 9.200, "POLIOL": 40.000, "COPOLIMERICO": 0.000 },
        "12 kg":     { "AGUA": 2.500, "SILICONA": 0.600, "GLISERINA": 0.100, "AMINA": 0.056, "T.9": 0.215, "TDI": 33.800, "CLORURO": 7.000, "POLIOL": 42.000, "COPOLIMERICO": 4.400 },
        "16 kg":     { "AGUA": 3.450, "SILICONA": 0.700, "GLISERINA": 0.100, "AMINA": 0.090, "T.9": 0.180, "TDI": 44.800, "CLORURO": 4.500, "POLIOL": 55.000, "COPOLIMERICO": 10.000 },
        "21 kg":     { "AGUA": 3.560, "SILICONA": 0.900, "GLISERINA": 0.100, "AMINA": 0.125, "T.9": 0.205, "TDI": 46.300, "CLORURO": 2.100, "POLIOL": 72.000, "COPOLIMERICO": 9.000 },
        "24 kg":     { "AGUA": 4.000, "SILICONA": 1.000, "GLISERINA": 0.100, "AMINA": 0.175, "T.9": 0.210, "TDI": 54.200, "CLORURO": 0.000, "POLIOL": 90.000, "COPOLIMERICO": 11.000 }
    }
};

const COMPUESTOS = ["AGUA", "SILICONA", "GLISERINA", "AMINA", "T.9", "TDI", "CLORURO", "POLIOL", "COPOLIMERICO"];

/* ---------- CONEXIÓN A SUPABASE ---------- */
const TABLA = 'lotes';
const cfg = window.SUPABASE_CONFIG || {};
const supabaseConfigurado = !!(cfg.url && cfg.anonKey && !cfg.url.includes('TU-PROYECTO') && cfg.anonKey !== 'TU_ANON_KEY');
const sb = supabaseConfigurado ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

/* ---------- ESTADO ---------- */
let lotesDia = [];              // lotes de la fecha seleccionada
let fechaSeleccionadaISO = "";
let lotesRango = [];            // lotes del último reporte generado
let rangoActual = { desde: "", hasta: "" };

/* =====================================================
 * UTILIDADES
 * ===================================================== */
function fechaAISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function obtenerFechaActualISO() {
    return fechaAISO(new Date());
}

function formatearFechaLatino(fechaISO) {
    if (!fechaISO) return "--/--/----";
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function decimalesCompuesto(comp) {
    return (comp === 'AMINA' || comp === 'T.9' || comp === 'GLISERINA') ? 3 : 2;
}

let toastTimer = null;
function mostrarToast(mensaje, tipo = 'ok') {
    const t = document.getElementById('toast');
    t.textContent = mensaje;
    t.className = `toast show ${tipo}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, tipo === 'error' ? 5000 : 2500);
}

function setEstadoConexion(estado, texto) {
    const el = document.getElementById('estado-conexion');
    el.className = `status-badge status-${estado}`;
    el.textContent = `● ${texto}`;
}

/* =====================================================
 * CÁLCULOS (reutilizados por el reporte diario y por rango)
 * ===================================================== */
function calcularPesoBloque(cajon, densidad) {
    const formula = FORMULAS[cajon] && FORMULAS[cajon][densidad];
    if (!formula) return 0;
    return COMPUESTOS.reduce((acc, c) => acc + (formula[c] || 0), 0);
}

function calcularConsumo(lotes) {
    const totales = {};
    COMPUESTOS.forEach(c => totales[c] = 0);
    let totalBloques = 0;
    let totalKg = 0;

    lotes.forEach(lote => {
        const formula = FORMULAS[lote.cajon] && FORMULAS[lote.cajon][lote.densidad];
        if (!formula) return; // densidad que ya no existe en las fórmulas
        totalBloques += lote.cantidad;
        COMPUESTOS.forEach(comp => {
            const kg = (formula[comp] || 0) * lote.cantidad;
            totales[comp] += kg;
            totalKg += kg;
        });
    });

    return { totales, totalBloques, totalKg };
}

function pintarTarjetasCompuestos(contenedorId, totales) {
    const cont = document.getElementById(contenedorId);
    cont.innerHTML = '';
    COMPUESTOS.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="compound-name">${comp}</div>
            <div class="compound-val">${formatearNumeroLatino(totales[comp], decimalesCompuesto(comp))}</div>
            <div class="compound-unit">KG</div>
        `;
        cont.appendChild(card);
    });
}

/* =====================================================
 * INICIALIZACIÓN
 * ===================================================== */
window.onload = function () {
    fechaSeleccionadaISO = obtenerFechaActualISO();
    document.getElementById('fecha-reporte').value = fechaSeleccionadaISO;

    // Rango por defecto del reporte: del 1° del mes a hoy
    aplicarAtajo('mes', false);

    actualizarOpcionesDensidad();
    renderizarModalTablas();
    actualizarEtiquetasFecha();

    if (!supabaseConfigurado) {
        setEstadoConexion('err', 'Falta configurar Supabase');
        mostrarToast('Completá la URL y la anon key en config.js', 'error');
        renderizarDia();
        return;
    }
    cargarDia();
};

/* =====================================================
 * PESTAÑAS
 * ===================================================== */
function mostrarVista(vista) {
    document.getElementById('vista-dia').classList.toggle('hidden', vista !== 'dia');
    document.getElementById('vista-rango').classList.toggle('hidden', vista !== 'rango');
    document.getElementById('tab-dia').classList.toggle('active', vista === 'dia');
    document.getElementById('tab-rango').classList.toggle('active', vista === 'rango');
}

/* =====================================================
 * CARGA DIARIA
 * ===================================================== */
function cambiarFechaReporte(nuevaFechaISO) {
    if (!nuevaFechaISO) return;
    fechaSeleccionadaISO = nuevaFechaISO;
    actualizarEtiquetasFecha();
    cargarDia();
}

function actualizarEtiquetasFecha() {
    const f = formatearFechaLatino(fechaSeleccionadaISO);
    document.getElementById('fecha-titulo-display').textContent = f;
    document.getElementById('fecha-lista-display').textContent = f;
    document.getElementById('print-fecha-display').textContent = `FECHA DE REPORTE: ${f}`;
}

function actualizarOpcionesDensidad() {
    const cajon = document.getElementById('cajon').value;
    const select = document.getElementById('densidad');
    select.innerHTML = '';
    Object.keys(FORMULAS[cajon]).forEach(opcion => {
        const opt = document.createElement('option');
        opt.value = opcion;
        opt.textContent = opcion;
        select.appendChild(opt);
    });
}

async function cargarDia() {
    if (!sb) { lotesDia = []; renderizarDia(); return; }

    const fechaPedida = fechaSeleccionadaISO;
    setEstadoConexion('off', 'Cargando...');
    try {
        const { data, error } = await sb
            .from(TABLA)
            .select('*')
            .eq('fecha', fechaPedida)
            .order('id', { ascending: true });
        if (error) throw error;

        // Si el usuario cambió de fecha mientras cargaba, se descarta esta respuesta
        if (fechaPedida !== fechaSeleccionadaISO) return;

        lotesDia = data;
        setEstadoConexion('on', 'Conectado');
    } catch (e) {
        console.error(e);
        if (fechaPedida !== fechaSeleccionadaISO) return;
        lotesDia = [];
        setEstadoConexion('err', 'Sin conexión');
        mostrarToast('No se pudieron cargar los lotes: ' + (e.message || e), 'error');
    }
    renderizarDia();
}

async function agregarLote(e) {
    e.preventDefault();
    if (!sb) { mostrarToast('Supabase no está configurado (config.js)', 'error'); return; }

    const cajon = document.getElementById('cajon').value;
    const densidad = document.getElementById('densidad').value;
    const cantidad = parseInt(document.getElementById('cantidad').value, 10);
    if (!cantidad || cantidad <= 0) return;

    const btn = document.getElementById('btn-agregar');
    btn.disabled = true;
    try {
        const { error } = await sb.from(TABLA).insert({
            fecha: fechaSeleccionadaISO,
            cajon,
            densidad,
            cantidad
        });
        if (error) throw error;

        document.getElementById('cantidad').value = '';
        mostrarToast('Lote guardado');
        await cargarDia();
    } catch (err) {
        console.error(err);
        mostrarToast('No se pudo guardar el lote: ' + (err.message || err), 'error');
    } finally {
        btn.disabled = false;
    }
}

async function eliminarLote(id) {
    if (!sb) return;
    try {
        const { error } = await sb.from(TABLA).delete().eq('id', id);
        if (error) throw error;
        mostrarToast('Lote eliminado');
        await cargarDia();
    } catch (err) {
        console.error(err);
        mostrarToast('No se pudo eliminar: ' + (err.message || err), 'error');
    }
}

async function reiniciarDia() {
    if (!sb || lotesDia.length === 0) return;
    const f = formatearFechaLatino(fechaSeleccionadaISO);
    if (!confirm(`¿Está seguro de que desea borrar todos los lotes del día ${f}? Esta acción no se puede deshacer.`)) return;

    try {
        const { error } = await sb.from(TABLA).delete().eq('fecha', fechaSeleccionadaISO);
        if (error) throw error;
        mostrarToast('Día reiniciado');
        await cargarDia();
    } catch (err) {
        console.error(err);
        mostrarToast('No se pudo reiniciar el día: ' + (err.message || err), 'error');
    }
}

function renderizarDia() {
    renderizarTablaLotes();
    renderizarResumenDia();
}

function renderizarTablaLotes() {
    const tbody = document.getElementById('tabla-lotes');
    tbody.innerHTML = '';

    if (lotesDia.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No se han registrado lotes para la fecha seleccionada (${formatearFechaLatino(fechaSeleccionadaISO)}).</td></tr>`;
        return;
    }

    lotesDia.forEach(lote => {
        const pesoTotalLote = calcularPesoBloque(lote.cajon, lote.densidad) * lote.cantidad;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-${lote.cajon}">CAJÓN ${lote.cajon}</span></td>
            <td><strong>${lote.densidad}</strong></td>
            <td>${lote.cantidad} bloque(s)</td>
            <td>~ ${formatearNumeroLatino(pesoTotalLote, 2)} KG</td>
            <td class="action-col" style="text-align: right;">
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="eliminarLote(${lote.id})">🗑️ Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarResumenDia() {
    const { totales, totalBloques, totalKg } = calcularConsumo(lotesDia);
    document.getElementById('bloques-totales-badge').textContent = `${totalBloques} bloques en total`;
    document.getElementById('total-general-kg').textContent = `${formatearNumeroLatino(totalKg, 2)} KG`;
    pintarTarjetasCompuestos('summary-cards', totales);
}

/* =====================================================
 * REPORTE POR RANGO DE FECHAS
 * ===================================================== */
function aplicarAtajo(tipo, generar = true) {
    const hoy = new Date();
    let desde, hasta;

    switch (tipo) {
        case 'hoy':
            desde = hasta = hoy;
            break;
        case 'semana': {
            // Semana de lunes a hoy
            const dia = hoy.getDay(); // 0 = domingo
            const diffLunes = dia === 0 ? 6 : dia - 1;
            desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diffLunes);
            hasta = hoy;
            break;
        }
        case 'mes':
            desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            hasta = hoy;
            break;
        case 'mes-anterior':
            desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            break;
        case 'anio':
            desde = new Date(hoy.getFullYear(), 0, 1);
            hasta = hoy;
            break;
    }

    document.getElementById('fecha-desde').value = fechaAISO(desde);
    document.getElementById('fecha-hasta').value = fechaAISO(hasta);
    if (generar) generarReporte();
}

// Trae todos los lotes del rango (Supabase devuelve máx. 1000 filas por consulta, por eso se pagina)
async function traerLotesRango(desde, hasta) {
    const tamPagina = 1000;
    let todos = [];
    let inicio = 0;

    while (true) {
        const { data, error } = await sb
            .from(TABLA)
            .select('*')
            .gte('fecha', desde)
            .lte('fecha', hasta)
            .order('fecha', { ascending: true })
            .order('id', { ascending: true })
            .range(inicio, inicio + tamPagina - 1);
        if (error) throw error;

        todos = todos.concat(data);
        if (data.length < tamPagina) break;
        inicio += tamPagina;
    }
    return todos;
}

async function generarReporte() {
    if (!sb) { mostrarToast('Supabase no está configurado (config.js)', 'error'); return; }

    const desde = document.getElementById('fecha-desde').value;
    const hasta = document.getElementById('fecha-hasta').value;

    if (!desde || !hasta) { mostrarToast('Elegí las fechas "Desde" y "Hasta"', 'error'); return; }
    if (desde > hasta) { mostrarToast('La fecha "Desde" no puede ser posterior a "Hasta"', 'error'); return; }

    try {
        lotesRango = await traerLotesRango(desde, hasta);
        rangoActual = { desde, hasta };
        setEstadoConexion('on', 'Conectado');
        renderizarReporteRango();
    } catch (err) {
        console.error(err);
        setEstadoConexion('err', 'Sin conexión');
        mostrarToast('No se pudo generar el reporte: ' + (err.message || err), 'error');
    }
}

function renderizarReporteRango() {
    const { desde, hasta } = rangoActual;
    const textoRango = `${formatearFechaLatino(desde)} al ${formatearFechaLatino(hasta)}`;
    document.getElementById('print-rango-display').textContent = `PERÍODO: ${textoRango}`;
    document.getElementById('resultado-rango').classList.remove('hidden');

    // --- Totales del período ---
    const { totales, totalBloques, totalKg } = calcularConsumo(lotesRango);
    document.getElementById('rango-bloques-badge').textContent = `${totalBloques} bloques en total`;
    document.getElementById('rango-total-kg').textContent = `${formatearNumeroLatino(totalKg, 2)} KG`;
    pintarTarjetasCompuestos('rango-summary-cards', totales);

    // --- Producción por cajón y densidad ---
    const tbodyDens = document.getElementById('tabla-rango-densidades');
    tbodyDens.innerHTML = '';

    if (lotesRango.length === 0) {
        tbodyDens.innerHTML = `<tr><td colspan="4" class="empty-state">No hay lotes registrados entre ${textoRango}.</td></tr>`;
        document.getElementById('thead-rango-dias').innerHTML = '';
        document.getElementById('tabla-rango-dias').innerHTML = '';
        document.getElementById('tfoot-rango-dias').innerHTML = '';
        return;
    }

    const porDensidad = {};
    lotesRango.forEach(l => {
        const clave = `${l.cajon}|${l.densidad}`;
        if (!porDensidad[clave]) porDensidad[clave] = { cajon: l.cajon, densidad: l.densidad, bloques: 0 };
        porDensidad[clave].bloques += l.cantidad;
    });

    Object.values(porDensidad)
        .sort((a, b) => a.cajon.localeCompare(b.cajon) || a.densidad.localeCompare(b.densidad, 'es', { numeric: true }))
        .forEach(item => {
            const kg = calcularPesoBloque(item.cajon, item.densidad) * item.bloques;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge badge-${item.cajon}">CAJÓN ${item.cajon}</span></td>
                <td><strong>${item.densidad}</strong></td>
                <td>${item.bloques}</td>
                <td>${formatearNumeroLatino(kg, 2)} KG</td>
            `;
            tbodyDens.appendChild(tr);
        });

    // --- Detalle por día ---
    const porDia = {};
    lotesRango.forEach(l => {
        if (!porDia[l.fecha]) porDia[l.fecha] = [];
        porDia[l.fecha].push(l);
    });

    document.getElementById('thead-rango-dias').innerHTML =
        `<tr><th>Fecha</th><th>Bloques</th><th>Total KG</th>${COMPUESTOS.map(c => `<th>${c}</th>`).join('')}</tr>`;

    const tbodyDias = document.getElementById('tabla-rango-dias');
    tbodyDias.innerHTML = '';

    Object.keys(porDia).sort().forEach(fecha => {
        const c = calcularConsumo(porDia[fecha]);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${formatearFechaLatino(fecha)}</strong></td>
            <td>${c.totalBloques}</td>
            <td>${formatearNumeroLatino(c.totalKg, 2)}</td>
            ${COMPUESTOS.map(comp => `<td>${formatearNumeroLatino(c.totales[comp], decimalesCompuesto(comp))}</td>`).join('')}
        `;
        tbodyDias.appendChild(tr);
    });

    document.getElementById('tfoot-rango-dias').innerHTML = `
        <tr>
            <td>TOTAL</td>
            <td>${totalBloques}</td>
            <td>${formatearNumeroLatino(totalKg, 2)}</td>
            ${COMPUESTOS.map(comp => `<td>${formatearNumeroLatino(totales[comp], decimalesCompuesto(comp))}</td>`).join('')}
        </tr>
    `;
}

/* ---------- EXPORTAR CSV (abre bien en Excel con configuración regional de Argentina) ---------- */
function exportarCSV() {
    if (lotesRango.length === 0) { mostrarToast('No hay datos para exportar', 'error'); return; }

    const num = (v, dec) => v.toFixed(dec).replace('.', ',');
    const filas = [];
    filas.push(['Fecha', 'Bloques', 'Total KG', ...COMPUESTOS].join(';'));

    const porDia = {};
    lotesRango.forEach(l => {
        if (!porDia[l.fecha]) porDia[l.fecha] = [];
        porDia[l.fecha].push(l);
    });

    Object.keys(porDia).sort().forEach(fecha => {
        const c = calcularConsumo(porDia[fecha]);
        filas.push([
            formatearFechaLatino(fecha),
            c.totalBloques,
            num(c.totalKg, 2),
            ...COMPUESTOS.map(comp => num(c.totales[comp], 3))
        ].join(';'));
    });

    const t = calcularConsumo(lotesRango);
    filas.push([
        'TOTAL',
        t.totalBloques,
        num(t.totalKg, 2),
        ...COMPUESTOS.map(comp => num(t.totales[comp], 3))
    ].join(';'));

    const blob = new Blob(['\uFEFF' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consumo-espuma_${rangoActual.desde}_a_${rangoActual.hasta}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* =====================================================
 * MODAL DE FÓRMULAS
 * ===================================================== */
function toggleModal(open) {
    document.getElementById('modal-formulas').classList.toggle('active', open);
}

function renderizarModalTablas() {
    const construirTabla = (cajonKey, targetId) => {
        const tabla = document.getElementById(targetId);
        const densidades = Object.keys(FORMULAS[cajonKey]);

        let html = `<thead><tr><th>COMPUESTO</th>`;
        densidades.forEach(d => html += `<th>${d}</th>`);
        html += `</tr></thead><tbody>`;

        COMPUESTOS.forEach(comp => {
            html += `<tr><td><strong>${comp}</strong></td>`;
            densidades.forEach(d => {
                const val = FORMULAS[cajonKey][d][comp];
                const dec = (comp === 'AMINA' || comp === 'T.9' || comp === 'GLISERINA') ? 3 : (val % 1 !== 0 ? 3 : 0);
                html += `<td>${val !== undefined ? (val === 0 ? "NO" : formatearNumeroLatino(val, dec)) : '-'}</td>`;
            });
            html += `</tr>`;
        });

        html += `</tbody>`;
        tabla.innerHTML = html;
    };

    construirTabla("240", "tabla-ref-240");
    construirTabla("280", "tabla-ref-280");
}
