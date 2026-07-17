/** Realistic WhatsApp chat export simulating Interplay FTTH operations */

export const WHATSAPP_CHAT_LINES = [
  `16/07/26, 8:15 a. m. - Ing. Pérez: Caja B.0.4
Puertos libres 5
Fibra 12 hilos
Rosado
Potencia -22
5.158860,-75.034560`,
  `16/07/26, 8:23 a. m. - Ing. Pérez: Mufla Norte
3.456789,-76.123456
Potencia -18
Fibra 24 hilos`,
  `16/07/26, 9:05 a. m. - Tec. García: Caja 3.2
Puertos 8
Libres 3
5.158870,-75.034570
Potencia -20`,
  `16/07/26, 9:30 a. m. - Ing. Pérez: Drop desde caja 3.2 alimenta caja B.5.1`,
  `16/07/26, 10:00 a. m. - Tec. García: Mufla Central
Revisada
5.158880,-75.034580
Fibra 48 hilos
Color azul`,
  `16/07/26, 10:15 a. m. - Ing. Pérez: Coordenadas: 5.158890, -75.034590
Nueva caja en la esquina
Potencia -24`,
  `16/07/26, 11:00 a. m. - Tec. García: Caja B.0.5
Puertos 16
Libres 12
Verde
5.158900,-75.034600
Potencia -19`,
  `16/07/27, 7:30 a. m. - Ing. Pérez: Mufla Sur alimenta caja 8.2
Coordenadas: 5.168000, -75.044000`,
  `16/07/27, 8:00 a. m. - Tec. García: Caja 4.1
Revisada y verificada
Fibra 12 hilos
5.158910,-75.034610`,
  `16/07/27, 8:45 a. m. - Ing. Pérez: Caja B.2.1
Puertos 8
Libres 2
Potencia -21
Color rosado
5.158920,-75.034620`,
  `16/07/27, 9:30 a. m. - Tec. García: Messages and calls are end-to-end encrypted. No one outside of this chat can read them.`,
  `16/07/27, 9:31 a. m. - Ing. Pérez: <Media omitted>`,
  `16/07/27, 10:00 a. m. - Tec. García: Ok, entendido`,
  `16/07/27, 10:15 a. m. - Ing. Pérez: Mufla Este alimenta caja B.0.4 y caja 3.2
5.178000,-75.054000`,
  `16/07/27, 11:00 a. m. - Tec. García: Caja 7.3
Coordenadas: 5.158930,-75.034630
Fibra 24 hilos
Potencia -23
Color blanco`,
  `16/07/27, 11:30 a. m. - Ing. Pérez: Re: Caja B.0.4 la fibra es rosada`,
  `16/07/27, 12:00 p. m. - Tec. García: Caja 5.2
Puertos 12
Libres 8
5.158940,-75.034640`,
  `16/07/27, 1:00 p. m. - Ing. Pérez: Reenviado
Caja 8.1 revisada`,
  `16/07/27, 2:00 p. m. - Tec. García: Mufla Oeste
5.158950,-75.034650
Potencia -25
Fibra 12 hilos`,
  `16/07/27, 3:00 p. m. - Ing. Pérez: Fibra desde caja B.0.4 a caja 3.2`,
  `16/07/28, 8:00 a. m. - Tec. García: Caja 6.1
Revisada
5.158960,-75.034660`,
  `16/07/28, 8:30 a. m. - Ing. Pérez: Mufla Norte alimenta caja B.5.1 y caja 4.1`,
  `16/07/28, 9:00 a. m. - Tec. García: Caja B.0.6
Puertos 16
Libres 14
5.158970,-75.034670
Potencia -18`,
  `16/07/28, 10:00 a. m. - Ing. Pérez: Coord: 5.158980, -75.034680
Nueva mufla sector sur`,
  `16/07/28, 11:00 a. m. - Tec. García: https://maps.google.com/?q=5.158990,-75.034690`,
  `16/07/28, 11:30 a. m. - Ing. Pérez: Mufla Central conectada a caja B.0.4`,
  `16/07/28, 12:00 p. m. - Tec. García: Caja 9.1
5.159000,-75.034700
Fibra 12 hilos
Verde`,
];

export const WHATSAPP_CHAT = WHATSAPP_CHAT_LINES.join('\n');

/** Expected parse results after filtering noise */
export const EXPECTED_DETECTED_COUNT = 18; // approximate count of entities with coords or valid data
export const EXPECTED_NOISE_COUNT = 6; // system messages, media, ok, url only

/** Expected relationship phrases found in the chat */
export const EXPECTED_RELATIONSHIP_COUNT = 8; // phrases like "Drop desde...", "alimenta...", "fibra desde..."

/** WhatsApp chat with duplicate coordinates for dedup testing */
export const WHATSAPP_CHAT_WITH_DUPLICATES = [
  `16/07/28, 1:00 p. m. - Tec. García: Caja Norte
5.158870,-75.034570
Puertos 8`,
  `16/07/28, 1:05 p. m. - Ing. Pérez: Caja Norte 2
5.158871,-75.034571
Puertos 8`,
  `16/07/28, 1:10 p. m. - Tec. García: Caja Sur
6.200000,-76.500000
Puertos 4`,
].join('\n');

/** Error cases for security validation */
export const MALICIOUS_CONTENT = '<script>alert("xss")</script>Contenido malicioso';
export const INVALID_COORDS = '100.0, 200.0';
export const LARGE_FILE_CONTENT = 'x'.repeat(60 * 1024 * 1024); // 60MB
export const WRONG_EXTENSION = 'datos.exe';
export const EMPTY_CONTENT = '';
export const SHORT_CONTENT = 'hola';
