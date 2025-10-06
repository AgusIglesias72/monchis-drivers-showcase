import React, { useState } from 'react';
import { Check, Info } from 'lucide-react';

const MONCHIS_RED = '#e7243f';

// Mapeo de requisitos con soporte para texto en negrita
const REQUIREMENTS_MAPPING = {
  requisitos: [
    'Pago solo por transferencia y POS',
    'Cuenta activa en <b>ueno bank</b>',
    'Desde sept. 2025: seguro gratis',
    'Celular Android',
    'Moto con documentos al día (cédula verde/F22, habilitación y registro)',
    'Certificado de antecedentes (policial o judicial)',
    'RUC activo (rubro 49231). Si precisás reactivarlo, podemos ayudarte a hacerlo'
  ],
  pagos: [
    'Transferencia bancaria',
    'Pago con <b>POS</b> en nuestras oficinas',
    'Pago en <b>efectivo</b> (solo en oficinas)',
    'Pago con <b>tarjeta de crédito</b> (hasta 12 cuotas)'
  ],
  tarifas: [
    'Tarifa base: <b>Gs. 2.500</b> por viaje',
    'Bonificación por <b>horario pico</b>: +20%',
    'Bonificación por <b>día festivo</b>: +50%',
    'Comisión de plataforma: <b>15%</b>'
  ]
};

export const InformationSection: React.FC = () => {
  const [activeInfoTab, setActiveInfoTab] = useState<'requisitos' | 'pagos' | 'tarifas'>('requisitos');

  return (
    <div className="relative max-w-2xl mx-auto px-4 pb-6">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Tabs internos */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveInfoTab('requisitos')}
              className={`flex-1 py-2 px-3 rounded-lg transition-all text-sm font-semibold ${
                activeInfoTab === 'requisitos' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={activeInfoTab === 'requisitos' ? { backgroundColor: MONCHIS_RED } : {}}
            >
              Requisitos
            </button>
            <button
              onClick={() => setActiveInfoTab('pagos')}
              className={`flex-1 py-2 px-3 rounded-lg transition-all text-sm font-semibold ${
                activeInfoTab === 'pagos' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={activeInfoTab === 'pagos' ? { backgroundColor: MONCHIS_RED } : {}}
            >
              Pagos
            </button>
            <button
              onClick={() => setActiveInfoTab('tarifas')}
              className={`flex-1 py-2 px-3 rounded-lg transition-all text-sm font-semibold ${
                activeInfoTab === 'tarifas' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={activeInfoTab === 'tarifas' ? { backgroundColor: MONCHIS_RED } : {}}
            >
              Tarifas
            </button>
          </div>
        </div>

        {/* Contenido según tab activo */}
        <div className="p-6">
          {activeInfoTab === 'requisitos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border-2" style={{ borderColor: MONCHIS_RED }}>
               <div className="text-lg font-medium text-center">
                 Podés unirte con sólo <span className="font-bold px-2 py-1 text-white rounded-full inline-block" style={{ backgroundColor: MONCHIS_RED }}>Gs. 100.000</span>
               </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4" style={{ color: MONCHIS_RED }}>Requisitos básicos</h3>
                <ul className="space-y-3">
                  {REQUIREMENTS_MAPPING.requisitos.map((req, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: MONCHIS_RED }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span 
                        className="text-gray-700" 
                        dangerouslySetInnerHTML={{ __html: req }}
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold px-2 py-1 text-white rounded-full text-center" style={{ backgroundColor: MONCHIS_RED }}>Costo total: Gs. 410.000</p>
                  <div className="flex items-center gap-1 mt-2 p-2 rounded-full">
                  <p className="text-sm text-gray-600 mt-1 leading-tight text-center max-w-lg mx-auto">
                   Este monto incluye <b>Remera + Mochila</b>. 
                   El saldo restante se reparte en cuotas durante las primeras quincenas.
                  </p>
                    </div>
                </div>
               
              </div>
            </div>
          )}

          {activeInfoTab === 'pagos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <h3 className="text-xl font-bold" style={{ color: MONCHIS_RED }}>Sistema de pago</h3>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MONCHIS_RED}20` }}>
                    <span className="font-bold text-sm" style={{ color: MONCHIS_RED }}>1</span>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Cierres de mes</p>
                    <p className="text-sm text-gray-600">Del 1 al 15 y del 16 al 30/31. Luego de entregada la factura, el pago es acreditado en hasta 5 días hábiles.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MONCHIS_RED}20` }}>
                    <span className="font-bold text-sm" style={{ color: MONCHIS_RED }}>2</span>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Días de cobro</p>
                    <p className="text-sm text-gray-600">Del 5 al 7 y del 19 al 21 de cada mes. Se acredita en la cuenta de <b>ueno bank</b>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MONCHIS_RED}20` }}>
                    <span className="font-bold text-sm" style={{ color: MONCHIS_RED }}>3</span>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Adelantos</p>
                    <p className="text-sm text-gray-600">Los adelantos son realizados entre quincenas. Como requisito se debe haber facturado un <b>mínimo de Gs. 500.000</b> en la semana posterior al cierre quincenal.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeInfoTab === 'tarifas' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center py-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl text-white">
                <p className="text-sm font-medium mb-2">Ingresos por pedido</p>
                <p className="text-4xl font-bold">Gs. 12.500</p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3" style={{ color: MONCHIS_RED }}>Extra por kilómetro</h3>
                <p className="text-sm text-gray-600 mb-4">Según distancia del comercio al punto de entrega:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { range: '3-5 km', price: '2.000' },
                    { range: '5-6.5 km', price: '3.000' },
                    { range: '6.5-8 km', price: '6.000' },
                    { range: '8-10 km', price: '8.000' },
                    { range: '10-12 km', price: '10.000' },
                    { range: '12-15 km', price: '15.000' }
                  ].map((item) => (
                    <div key={item.range} className="bg-white border-2 rounded-xl p-3 text-center" style={{ borderColor: MONCHIS_RED }}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">{item.range}</div>
                      <div className="text-lg font-bold" style={{ color: MONCHIS_RED }}>Gs. {item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};