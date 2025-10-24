"use strict";
// test-drive-connection.ts
// Script para probar la conexión con Google Drive y descargar un archivo de prueba
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
var googleapis_1 = require("googleapis");
var fs_1 = require("fs");
require("dotenv/config"); // 👈 AGREGAR ESTA LÍNEA AL INICIO
function testDriveConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var email, key, auth, drive, testFileId, metadata, response, buffer, header, detectedType, testOutputPath, fileError_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🔧 Testing Google Drive Connection...\n');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    // 1. Verificar variables de entorno
                    console.log('1️⃣ Verificando variables de entorno...');
                    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
                    key = process.env.GOOGLE_PRIVATE_KEY;
                    if (!email || !key) {
                        console.error('❌ Faltan variables de entorno:');
                        if (!email)
                            console.error('   - GOOGLE_SERVICE_ACCOUNT_EMAIL');
                        if (!key)
                            console.error('   - GOOGLE_PRIVATE_KEY');
                        process.exit(1);
                    }
                    console.log("\u2705 GOOGLE_SERVICE_ACCOUNT_EMAIL: ".concat(email));
                    console.log("\u2705 GOOGLE_PRIVATE_KEY: ".concat(key.substring(0, 50), "..."));
                    // 2. Autenticar
                    console.log('\n2️⃣ Autenticando con Google Drive API...');
                    auth = new googleapis_1.google.auth.GoogleAuth({
                        credentials: {
                            client_email: email,
                            private_key: key.replace(/\\n/g, '\n'),
                        },
                        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                    });
                    drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
                    console.log('✅ Autenticación configurada');
                    // 3. Probar con un ID de archivo del XLSX
                    console.log('\n3️⃣ Probando descarga de archivo de prueba...');
                    testFileId = '1SobHqtor2mIEVBo2VHhMT-NMxBSDGIfB';
                    console.log("\uD83D\uDCE5 Intentando descargar archivo: ".concat(testFileId));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, drive.files.get({
                            fileId: testFileId,
                            fields: 'id, name, mimeType, size, createdTime'
                        })];
                case 3:
                    metadata = _a.sent();
                    console.log('\n📋 Metadata del archivo:');
                    console.log("   Nombre: ".concat(metadata.data.name));
                    console.log("   Tipo: ".concat(metadata.data.mimeType));
                    console.log("   Tama\u00F1o: ".concat(metadata.data.size ? "".concat((parseInt(metadata.data.size) / 1024).toFixed(2), " KB") : 'N/A'));
                    console.log("   Creado: ".concat(metadata.data.createdTime));
                    return [4 /*yield*/, drive.files.get({ fileId: testFileId, alt: 'media' }, { responseType: 'arraybuffer' })];
                case 4:
                    response = _a.sent();
                    buffer = Buffer.from(response.data);
                    console.log("\n\u2705 Archivo descargado exitosamente: ".concat(buffer.length, " bytes"));
                    header = buffer.slice(0, 8).toString('hex');
                    detectedType = 'unknown';
                    if (header.startsWith('ffd8ff'))
                        detectedType = 'JPEG';
                    else if (header.startsWith('89504e47'))
                        detectedType = 'PNG';
                    else if (header.startsWith('25504446'))
                        detectedType = 'PDF';
                    else if (header.startsWith('47494638'))
                        detectedType = 'GIF';
                    console.log("\uD83D\uDCC4 Tipo detectado: ".concat(detectedType));
                    testOutputPath = '/home/claude/test-download.jpg';
                    return [4 /*yield*/, fs_1.promises.writeFile(testOutputPath, buffer)];
                case 5:
                    _a.sent();
                    console.log("\uD83D\uDCBE Archivo guardado en: ".concat(testOutputPath));
                    console.log('\n✅ TEST EXITOSO - Google Drive funcionando correctamente!');
                    console.log('\n💡 Siguiente paso: Ejecutar validate-xlsx.ts');
                    return [3 /*break*/, 7];
                case 6:
                    fileError_1 = _a.sent();
                    console.error('\n❌ Error descargando archivo de prueba:');
                    console.error("   ".concat(fileError_1.message));
                    if (fileError_1.code === 404) {
                        console.error('\n💡 Posibles causas:');
                        console.error('   1. El archivo no existe o fue eliminado');
                        console.error('   2. La cuenta de servicio no tiene permisos para acceder al archivo');
                        console.error('   3. El ID del archivo es incorrecto');
                        console.error('\n🔧 Solución:');
                        console.error('   - Compartir los archivos de Drive con la cuenta de servicio:');
                        console.error("     ".concat(email));
                        console.error('   - O agregar la cuenta de servicio como "viewer" a la carpeta de Drive');
                    }
                    throw fileError_1;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('\n❌ Error en el test:', error_1.message);
                    console.error('\n🔧 Troubleshooting:');
                    console.error('   1. Verificar que las credenciales sean correctas');
                    console.error('   2. Verificar que la cuenta de servicio tenga acceso a los archivos');
                    console.error('   3. Verificar que los archivos de Drive no hayan sido eliminados');
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Función auxiliar para probar múltiples IDs del XLSX
function testMultipleFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var testIds, auth, drive, successful, failed, _i, testIds_1, fileId, metadata, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('\n🔧 Testing múltiples archivos del XLSX...\n');
                    testIds = [
                        '1SobHqtor2mIEVBo2VHhMT-NMxBSDGIfB', // Cédula 1
                        '13RDxkgfzKkZe7HfE3_6Hm3Qr4AX3cg-E', // Antecedentes
                    ];
                    auth = new googleapis_1.google.auth.GoogleAuth({
                        credentials: {
                            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                            private_key: (_a = process.env.GOOGLE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
                        },
                        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                    });
                    drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
                    successful = 0;
                    failed = 0;
                    _i = 0, testIds_1 = testIds;
                    _b.label = 1;
                case 1:
                    if (!(_i < testIds_1.length)) return [3 /*break*/, 6];
                    fileId = testIds_1[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    console.log("\n\uD83D\uDCC4 Probando archivo: ".concat(fileId));
                    return [4 /*yield*/, drive.files.get({
                            fileId: fileId,
                            fields: 'id, name, mimeType, size'
                        })];
                case 3:
                    metadata = _b.sent();
                    console.log("   \u2705 ".concat(metadata.data.name, " - ").concat(metadata.data.mimeType));
                    successful++;
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _b.sent();
                    console.log("   \u274C Error: ".concat(error_2.message));
                    failed++;
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log('\n' + '='.repeat(60));
                    console.log("\u2705 Exitosos: ".concat(successful, "/").concat(testIds.length));
                    console.log("\u274C Fallidos: ".concat(failed, "/").concat(testIds.length));
                    console.log('='.repeat(60));
                    if (failed > 0) {
                        console.log('\n⚠️  Algunos archivos no se pudieron acceder.');
                        console.log('   Asegúrate de compartir todos los archivos con la cuenta de servicio.');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Ejecutar ambos tests
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('='.repeat(60));
                    console.log('🧪 GOOGLE DRIVE CONNECTION TEST');
                    console.log('='.repeat(60) + '\n');
                    return [4 /*yield*/, testDriveConnection()];
                case 1:
                    _a.sent();
                    console.log('\n' + '='.repeat(60));
                    console.log('🧪 TESTING MÚLTIPLES ARCHIVOS');
                    console.log('='.repeat(60));
                    return [4 /*yield*/, testMultipleFiles()];
                case 2:
                    _a.sent();
                    console.log('\n✅ Todos los tests completados!\n');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});
