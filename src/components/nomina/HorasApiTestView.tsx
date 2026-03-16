import { useState } from 'react';

const DEFAULT_ENDPOINT = 'https://n8n.172.10.219.15.sslip.io/webhook/urbapark/horas/test';
const DEFAULT_API_KEY = 'u37KhX9gYj2Ns5rPAWq4EtZcLVtMoF16';

const DEFAULT_BODY = `{
  "id": "41568",
  "cedula": "1004030720",
  "cc_pertenece": "0220002",
  "cc_trabajado": "0220002",
  "acuerdo_horas": "COMPLETO",
  "acuerdo_movilizacion": "MOV_AIMS",
  "semana": "4",
  "estado_dia": "Libre",
  "fecha": "2026-01-24",
  "ingreso": "00:00",
  "salida": "00:00"
}`;

const HorasApiTestView = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [requestBody, setRequestBody] = useState(DEFAULT_BODY);
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [useProxy, setUseProxy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [responseText, setResponseText] = useState('');
  const [statusLine, setStatusLine] = useState('');

  const handleSend = async () => {
    setError('');
    setResponseText('');
    setStatusLine('');

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch {
      setError('El body no es un JSON valido.');
      return;
    }

    try {
      setLoading(true);

      let finalUrl = endpoint;
      let fetchOptions: RequestInit = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() ? { 'x-api-key': apiKey.trim() } : {}),
        },
      }

      if (method === 'GET' && useProxy) {
        // Browser no permite body en GET; enviamos por POST al middleware local
        // y el middleware reenvia como GET con body hacia n8n.
        finalUrl = '/api/n8n/get-with-body'
        fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint,
            payload: parsedBody,
            apiKey: apiKey.trim(),
          }),
        }
      } else {
        if (useProxy) {
          const urlObj = new URL(endpoint)
          finalUrl = `/api/n8n${urlObj.pathname}${urlObj.search}`
        }

        if (method === 'GET') {
          const params = new URLSearchParams()
          Object.keys(parsedBody).forEach((key) => {
            params.append(key, String(parsedBody[key]))
          })
          finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${params.toString()}`
        } else {
          fetchOptions.body = JSON.stringify(parsedBody)
        }
      }

      const response = await fetch(finalUrl, fetchOptions);

      setStatusLine(`HTTP ${response.status} ${response.statusText}`);

      const text = await response.text();
      if (!text) {
        setResponseText('(Sin contenido en la respuesta)');
        return;
      }

      try {
        const data = JSON.parse(text);
        setResponseText(JSON.stringify(data, null, 2));
      } catch {
        setResponseText(text);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Error desconocido al enviar la solicitud.';
      let message = rawMessage;
      
      if (rawMessage.includes('Failed to fetch') || rawMessage.toLowerCase().includes('cors')) {
        message = `❌ Error de CORS o conexión bloqueada.\n\n` +
          `El servidor ${endpoint} no permite peticiones desde este origen (localhost:5173).\n\n` +
          `Soluciones:\n` +
          `1. Configurar CORS en el servidor n8n (agregar Access-Control-Allow-Origin: *)\n` +
          `2. Usar el endpoint desde producción (sin localhost)\n` +
          `3. Usar extensión de navegador para deshabilitar CORS temporalmente\n` +
          `4. Configurar un proxy en el servidor de desarrollo`;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
      setError('');
    } catch {
      setError('No se pudo formatear porque el JSON no es valido.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Prueba API Horas</h2>
        <p className="text-slate-500 mt-1">
          Envie registros manuales al webhook de horas de nomina para pruebas rapidas.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Método HTTP</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMethod('GET')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                method === 'GET'
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                  : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200'
              }`}
            >
              GET
            </button>
            <button
              type="button"
              onClick={() => setMethod('POST')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                method === 'POST'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                  : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200'
              }`}
            >
              POST
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Endpoint</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="https://..."
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-200"
            />
            <span className="text-xs text-slate-600">Usar proxy local (evita CORS)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">x-api-key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ingrese API key"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-700">Body (JSON)</label>
            <button
              type="button"
              onClick={handleFormatJson}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Formatear JSON
            </button>
          </div>
          {method === 'GET' && useProxy && (
            <p className="text-xs text-emerald-600 mb-2">
              ✓ Con proxy activo, este JSON se enviara como body GET en n8n (modo Postman).
            </p>
          )}
          {method === 'GET' && !useProxy && (
            <p className="text-xs text-amber-600 mb-2">
              ⚠️ Sin proxy, GET no admite body en navegador. Este JSON se enviara como query params.
            </p>
          )}
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className="w-full h-72 rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed ${
              method === 'GET' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Enviando...' : `Enviar ${method}`}
          </button>
          <span className="text-xs text-slate-500">Método: {method}</span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-line">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">Respuesta</h3>
        {statusLine && <p className="text-sm text-slate-600 mt-1">{statusLine}</p>}
        <pre className="mt-3 bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-auto min-h-[180px]">
          {responseText || 'Aun no hay respuesta. Envie una solicitud para ver el resultado.'}
        </pre>
      </div>
    </div>
  );
};

export default HorasApiTestView;
