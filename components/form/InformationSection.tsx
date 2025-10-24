import React, { useState } from 'react';
import { Check, Info, Calendar, TrendingUp } from 'lucide-react';
import Image from 'next/image';

const MONCHIS_RED = '#e7243f';
const UENO_GREEN = '#7af5c0';

export const InformationSection: React.FC = () => {
  const [activeInfoTab, setActiveInfoTab] = useState<'requisitos' | 'pagos' | 'tarifas'>('requisitos');

  const requisitos = [
    'Mayor de 18 años',
    'Celular Android',
    'Moto con documentos al día (cédula verde/F22, habilitación y registro)',
    'Certificado de antecedentes (policial o judicial)',
    'RUC activo (rubro 49231). Si precisás reactivarlo, podemos ayudarte a hacerlo',
    'Cuenta activa en <b>ueno bank</b> para cobrar tus comisiones'
  ];

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
              {/* Pago inicial destacado */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border-2" style={{ borderColor: MONCHIS_RED }}>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Pago inicial requerido</p>
                  <div className="text-4xl font-bold mb-3" style={{ color: MONCHIS_RED }}>
                    Gs. 100.000
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Este monto es <strong>requisito para comenzar a realizar entregas</strong>. Lo podés abonar mediante transferencia previo a la capacitación o ese mismo día.
                  </p>
                </div>
              </div>

              {/* Requisitos básicos */}
              <div>
                <h3 className="text-xl font-bold mb-4" style={{ color: MONCHIS_RED }}>Requisitos básicos</h3>
                <ul className="space-y-3">
                  {requisitos.map((req, idx) => (
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
              </div>

              {/* Información de ueno bank */}
              <div className="rounded-xl p-4 border-2" style={{ backgroundColor: `${UENO_GREEN}15`, borderColor: UENO_GREEN }}>
                <div className="flex items-start gap-3">
                  <Image 
                    src="https://www.ueno.com.py/wp-content/uploads/2024/07/Brand.svg" 
                    alt="ueno bank" 
                    width={120}
                    height={30}
                    className="h-8 flex-shrink-0 mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-semibold mb-2">
                      ¿Por qué necesito una cuenta en ueno bank?
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      Es el banco con el que trabajamos para realizar los pagos de comisiones a todos nuestros drivers. ¡Es rápido y fácil abrir tu cuenta!
                    </p>
                    <p className="text-xs text-gray-600 italic">
                      <strong>Beneficio exclusivo:</strong> Como driver de Monchis, accedés de forma gratuita a <strong>ueno seguros</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Costo total del equipo */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-800">Costo total del equipo:</span>
                  <span className="text-2xl font-bold" style={{ color: MONCHIS_RED }}>Gs. 418.000</span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>Mochila térmica profesional</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>Remera Monchis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>Porta vasos</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-300">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    El <strong>saldo restante (318.000 Gs.)</strong> se descuenta automáticamente de tus comisiones quincenales. Este monto <strong>no es reembolsable</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeInfoTab === 'pagos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6" style={{ color: MONCHIS_RED }} />
                <h3 className="text-xl font-bold" style={{ color: MONCHIS_RED }}>Sistema de pagos quincenales</h3>
              </div>
              
              <div className="space-y-4">
                {/* Cierres de mes */}
                <div className="bg-white border-2 rounded-xl p-4" style={{ borderColor: MONCHIS_RED }}>
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: MONCHIS_RED }}>
                      <span className="font-bold text-white">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 mb-2">Cierres quincenales</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <strong>Primera quincena:</strong> del 1 al 15<br/>
                        <strong>Segunda quincena:</strong> del 16 al 30/31
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Luego de entregada la factura, el pago es acreditado en hasta <strong>5 días hábiles</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Días de cobro con logo ueno */}
                <div className="bg-white border-2 rounded-xl p-4" style={{ borderColor: UENO_GREEN }}>
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: UENO_GREEN }}>
                      <span className="font-bold text-gray-900">2</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-gray-800">Días de cobro en</p>
                        <Image 
                          src="https://www.ueno.com.py/wp-content/uploads/2024/07/Brand.svg" 
                          alt="ueno bank" 
                          width={80}
                          height={20}
                          className="h-5"
                        />
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <strong>Primera quincena:</strong> del 5 al 7<br/>
                        <strong>Segunda quincena:</strong> del 19 al 21
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        El dinero se acredita directamente en tu cuenta de ueno bank.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adelantos */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200">
                      <span className="font-bold text-gray-700">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 mb-2">Adelantos disponibles</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Los adelantos son realizados entre quincenas. Como requisito se debe haber facturado un <strong>mínimo de Gs. 500.000</strong> en la semana posterior al cierre quincenal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    <strong>Importante:</strong> Para cobrar tus comisiones es obligatorio tener una cuenta activa en ueno bank.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeInfoTab === 'tarifas' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              {/* Ingreso base destacado */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-10"></div>
                <div className="relative text-center py-8 px-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border-2" style={{ borderColor: MONCHIS_RED }}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5" style={{ color: MONCHIS_RED }} />
                    <p className="text-sm font-semibold text-gray-600">Ingreso base por pedido</p>
                  </div>
                  <p className="text-5xl font-bold mb-2" style={{ color: MONCHIS_RED }}>Gs. 12.500</p>
                  <p className="text-sm text-gray-600">+ extras por distancia</p>
                </div>
              </div>

              {/* Extra por kilómetro */}
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: MONCHIS_RED }}>Extra por kilómetro</h3>
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
                    <div key={item.range} className="bg-white border-2 rounded-xl p-3 text-center hover:shadow-md transition-shadow" style={{ borderColor: MONCHIS_RED }}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">{item.range}</div>
                      <div className="text-lg font-bold" style={{ color: MONCHIS_RED }}>+{item.price}</div>
                      <div className="text-xs text-gray-500">Gs.</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ejemplo de ganancias */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                <p className="font-bold text-green-900 mb-3 text-center">💰 Ejemplo de pedido</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tarifa base:</span>
                    <span className="font-semibold text-gray-900">Gs. 12.500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Distancia (7 km):</span>
                    <span className="font-semibold text-gray-900">+ Gs. 6.000</span>
                  </div>
                  <div className="border-t border-green-300 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total ganado:</span>
                    <span className="font-bold text-xl text-green-700">Gs. 18.500</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};