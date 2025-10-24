"use strict";
// validate-xlsx.ts
// Script para validar la estructura del XLSX antes de ejecutar la migración
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var XLSX = __importStar(require("xlsx"));
var fs_1 = require("fs");
require("dotenv/config"); // 👈 AGREGAR ESTA LÍNEA AL INICIO
var EXPECTED_COLUMNS = {
    'LINK P/ CONTACTAR ': 0,
    'Marca temporal': 1,
    'Dirección de correo electrónico': 3,
    'NOMBRES Y APELLIDOS: ': 4,
    'NUMERO DE CI: (Paraguay)': 5,
    'FECHA DE NACIMIENTO:': 6,
    'TELEFONO / CELULAR: ': 9,
    'DEPARTAMENTO:': 11,
    'CIUDAD:': 12,
    'BARRIO:': 13,
    'DIRECCIÓN DOMICILIO:': 14,
    'NOMBRE DE CONTACTO DE EMERGENCIA:': 15,
    'PARENTESCO CON CONTACTO DE EMERGENCIA': 16,
    'NÚMERO DE CONTACTO DE EMERGENCIA:  EJ. 0984111000(SIN ESPACIOS)': 17,
    'CEDULA DE IDENTIDAD O PASAPORTE:': 18,
    'ANTECEDENTE POLICIAL, JUDICIAL O INTERPOL:': 19,
    'SELECCIONE ZONA EN LA QUE TE GUSTARÍA TRABAJAR: ': 22,
    '¿Cómo te enteraste de nosotros?': 23,
    'MARCA DEL RODADO:': 28,
    'MODELO DEL RODADO:': 29,
    'CHAPA DEL RODADO:': 30,
    'AÑO DEL RODADO:': 31,
    '¿Contas con factura a tu nombre?': 33,
    'En caso de contar con Factura Cargar Certificado de cumplimiento tributario': 34,
    '¿Le interesaría nuestro servicio de contabilidad con CONTO? ': 35,
    '¿Tenes una cuenta bancaria con ueno bank? ': 36,
    'Adjunte comprobante de pago: ': 38,
    'FORMA DE PAGO': 39,
    'NRO COMP. DE PAGO': 40,
    'NRO DE FACTURA': 41,
    'MONTO ENTREGA': 42,
    'FECHA DE AGENDAMIENTO': 46,
    'Agendamiento confirmado': 47,
    'Capacitado': 48,
};
function extractDriveIds(content) {
    if (!content)
        return 0;
    var contentStr = String(content);
    var matches = contentStr.match(/drive\.google\.com|id=/g);
    return matches ? matches.length : 0;
}
function validateXLSX(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var result, fileBuffer, workbook, worksheet, data, headers, missingColumns, _i, _a, _b, columnName, expectedIndex, i, row, cedulaDocs, antecedentes, i, row, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    result = {
                        isValid: true,
                        errors: [],
                        warnings: [],
                        stats: {
                            totalRows: 0,
                            withEmail: 0,
                            withCedula: 0,
                            withDocuments: 0,
                            withPayment: 0,
                            withOnboarding: 0,
                        }
                    };
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    console.log('📖 Leyendo archivo XLSX...\n');
                    return [4 /*yield*/, fs_1.promises.readFile(filePath)];
                case 2:
                    fileBuffer = _c.sent();
                    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                    worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                    if (data.length === 0) {
                        result.isValid = false;
                        result.errors.push('El archivo está vacío');
                        return [2 /*return*/, result];
                    }
                    headers = data[0];
                    console.log('📋 Validando estructura de columnas...\n');
                    missingColumns = 0;
                    for (_i = 0, _a = Object.entries(EXPECTED_COLUMNS); _i < _a.length; _i++) {
                        _b = _a[_i], columnName = _b[0], expectedIndex = _b[1];
                        if (headers[expectedIndex] !== columnName) {
                            result.warnings.push("Columna en \u00EDndice ".concat(expectedIndex, " esperada: \"").concat(columnName, "\", encontrada: \"").concat(headers[expectedIndex], "\""));
                            missingColumns++;
                        }
                    }
                    if (missingColumns > 0) {
                        console.log("\u26A0\uFE0F  ".concat(missingColumns, " columnas no coinciden exactamente con lo esperado\n"));
                    }
                    else {
                        console.log("\u2705 Todas las columnas requeridas est\u00E1n presentes\n");
                    }
                    // Analizar datos
                    console.log('📊 Analizando datos...\n');
                    result.stats.totalRows = data.length - 1; // Excluyendo header
                    for (i = 1; i < data.length; i++) {
                        row = data[i];
                        // Email
                        if (row[3])
                            result.stats.withEmail++;
                        // Cédula
                        if (row[5])
                            result.stats.withCedula++;
                        cedulaDocs = extractDriveIds(row[18]);
                        antecedentes = extractDriveIds(row[19]);
                        if (cedulaDocs > 0 || antecedentes > 0) {
                            result.stats.withDocuments++;
                        }
                        // Pago
                        if (row[39] || row[42])
                            result.stats.withPayment++;
                        // Onboarding
                        if (row[46])
                            result.stats.withOnboarding++;
                    }
                    // Validaciones de consistencia
                    console.log('🔍 Validando consistencia de datos...\n');
                    if (result.stats.withEmail < result.stats.totalRows * 0.9) {
                        result.warnings.push("Solo ".concat(result.stats.withEmail, "/").concat(result.stats.totalRows, " filas tienen email (< 90%)"));
                    }
                    if (result.stats.withCedula < result.stats.totalRows * 0.9) {
                        result.warnings.push("Solo ".concat(result.stats.withCedula, "/").concat(result.stats.totalRows, " filas tienen c\u00E9dula (< 90%)"));
                    }
                    if (result.stats.withDocuments < result.stats.totalRows * 0.5) {
                        result.warnings.push("Solo ".concat(result.stats.withDocuments, "/").concat(result.stats.totalRows, " filas tienen documentos (< 50%)"));
                    }
                    // Verificar registros de ejemplo
                    console.log('📝 Verificando primeros 3 registros...\n');
                    for (i = 1; i <= Math.min(3, data.length - 1); i++) {
                        row = data[i];
                        console.log("Registro ".concat(i, ":"));
                        console.log("  Nombre: ".concat(row[4] || 'N/A'));
                        console.log("  C\u00E9dula: ".concat(row[5] || 'N/A'));
                        console.log("  Email: ".concat(row[3] || 'N/A'));
                        console.log("  Docs C\u00E9dula: ".concat(extractDriveIds(row[18]), " URLs"));
                        console.log("  Docs Antecedentes: ".concat(extractDriveIds(row[19]), " URLs"));
                        console.log("  M\u00E9todo pago: ".concat(row[39] || 'N/A'));
                        console.log("  Onboarding: ".concat(row[46] ? 'Sí' : 'No'));
                        console.log('');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    result.isValid = false;
                    result.errors.push("Error leyendo archivo: ".concat(error_1));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, result];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var xlsxPath, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    xlsxPath = './postulacion.xlsx';
                    console.log('🔍 VALIDADOR DE XLSX PARA MIGRACIÓN\n');
                    console.log('='.repeat(60));
                    console.log("Archivo: ".concat(xlsxPath));
                    console.log('='.repeat(60) + '\n');
                    return [4 /*yield*/, validateXLSX(xlsxPath)];
                case 1:
                    result = _a.sent();
                    // Mostrar resultados
                    console.log('\n' + '='.repeat(60));
                    console.log('📊 ESTADÍSTICAS');
                    console.log('='.repeat(60));
                    console.log("Total de registros: ".concat(result.stats.totalRows));
                    console.log("Con email: ".concat(result.stats.withEmail, " (").concat(((result.stats.withEmail / result.stats.totalRows) * 100).toFixed(1), "%)"));
                    console.log("Con c\u00E9dula: ".concat(result.stats.withCedula, " (").concat(((result.stats.withCedula / result.stats.totalRows) * 100).toFixed(1), "%)"));
                    console.log("Con documentos: ".concat(result.stats.withDocuments, " (").concat(((result.stats.withDocuments / result.stats.totalRows) * 100).toFixed(1), "%)"));
                    console.log("Con datos de pago: ".concat(result.stats.withPayment, " (").concat(((result.stats.withPayment / result.stats.totalRows) * 100).toFixed(1), "%)"));
                    console.log("Con onboarding: ".concat(result.stats.withOnboarding, " (").concat(((result.stats.withOnboarding / result.stats.totalRows) * 100).toFixed(1), "%)"));
                    if (result.errors.length > 0) {
                        console.log('\n' + '='.repeat(60));
                        console.log('❌ ERRORES');
                        console.log('='.repeat(60));
                        result.errors.forEach(function (error) { return console.log("  - ".concat(error)); });
                    }
                    if (result.warnings.length > 0) {
                        console.log('\n' + '='.repeat(60));
                        console.log('⚠️  ADVERTENCIAS');
                        console.log('='.repeat(60));
                        result.warnings.forEach(function (warning) { return console.log("  - ".concat(warning)); });
                    }
                    console.log('\n' + '='.repeat(60));
                    if (result.isValid && result.errors.length === 0) {
                        console.log('✅ VALIDACIÓN EXITOSA');
                        console.log('='.repeat(60));
                        console.log('\n✅ El archivo está listo para migración!');
                        console.log('\n💡 Siguiente paso:');
                        console.log('   npm run migrate:drivers\n');
                    }
                    else {
                        console.log('❌ VALIDACIÓN FALLIDA');
                        console.log('='.repeat(60));
                        console.log('\n❌ Por favor corrige los errores antes de migrar.\n');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('Error fatal:', error);
    process.exit(1);
});
