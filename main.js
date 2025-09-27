const TelegramBot = require('node-telegram-bot-api');
const tmo = require('./mangasTMO.js');
const wiki = require('./mangasWIKICRAB.js');
const mi2manga = require('./mi2manga.js');
const tresdaos = require('./3daos.js');

// TOKEN DE BOTFATHER DE TELEGRAM
const token = 'XXXXXXX:AAAAAAAA';

const bot = new TelegramBot(token, {polling: true});

// RUTA DONDE GUARDAR LAS DESCARGAS POR DEFECTO
var disco_duro = "/srv/dev-disk-by-uuid-*/MangasSengaNode/";
var servidor = "";

// TU CHAT ID DE TELEGRAM
let administradores = [
'00000000000000000'
]

bot.onText(/\/disco/, async (msg) => {   

  administradores.forEach(async (e) => {

    if(e == msg.chat.id){

    	// CAMBIAR RUTAS DE ALMACENAMIENTO DE LOS MANGAS 
		let options = {
		      reply_markup: JSON.stringify({
		        inline_keyboard: [
		          [{ text: 'mangas 1', callback_data: "disco*/srv/dev-disk-by-uuid-*/MangasSengaNode/" }],
		          [{ text: 'mangas 2', callback_data: "disco*/srv/dev-disk-by-uuid-*2/mangas_3/" }]
		        ]
		      })
		    };

		bot.sendMessage(msg.chat.id, "Donde guardar los mangas?", options);

    }

  })

});

bot.onText(/\/descargar/, (msg) => {   

  administradores.forEach(async (e) => {

    if(e == msg.chat.id){

    	// SERVIDORES DE DESCARGAS PERMITIDOS POR EL MOMENTO 
		let options = {
		      reply_markup: JSON.stringify({
		        inline_keyboard: [
		          [{ text: 'tmo', callback_data: "servidor*tmo" }],
		          //[{ text: 'wikicrab', callback_data: "servidor*wikicrab" }],
		          //[{ text: 'mi2manga', callback_data: "servidor*mi2manga" }],
		          [{ text: '3daos', callback_data: "servidor*3daos" }],
		        ]
		      })
		    };

		await bot.sendMessage(msg.chat.id, "Que servidor es?", options);

    }

  });

});

function ReplyToMessage(id,menu){

    return new Promise( async (resolve, reject) => {
      
        const SolicitudPrompt = await bot.sendMessage(id,menu, { reply_markup: {force_reply: true },parse_mode : "HTML"});

        return bot.onReplyToMessage(id, SolicitudPrompt.message_id, async (formatoMsg) => { resolve(formatoMsg.text); });

    });

}

bot.on('callback_query',async function onCallbackQuery(callbackQuery) {

  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };

  switch(action.split('*')[0]){

  	case 'disco':

  		disco_duro = action.split('*')[1];
  		bot.editMessageText(`ruta de disco guardada!`, opts);

  	break;

  	case 'servidor':

  			bot.editMessageText(`servidor seleccionado correctamente!`, opts);

				if(action.split('*')[1] == 'tmo'){

			    let url = await ReplyToMessage(msg.chat.id,'<b>Ingrese la url de tmo!</b>\n');

					let myMangaTMO = new tmo(disco_duro,url);

					await myMangaTMO.obtenerDOM();

					await myMangaTMO.obtenerDatosManga();

					await myMangaTMO.obtenerCapitulos();

					await bot.sendMessage(msg.chat.id,`<b>${await myMangaTMO.nombreManga()}</b>\n<b>${await myMangaTMO.cantCapitulos()}</b>\n`, { parse_mode : "HTML"});

					const ini = await ReplyToMessage(msg.chat.id,'<b>Donde Comienza</b>\n');
					const fin = await ReplyToMessage(msg.chat.id,'<b>Donde Termina</b>\n');

					myMangaTMO.preguntar(ini,fin);

					await myMangaTMO.descargarImagenes();

					// ESTO COMPRIME EL MANGA A CBR EN LA CARPETA PERO TARDA EN COMPRIMIR
					//await myMangaTMO.comprimir(await myMangaTMO.rutaCompleta(),(ini==fin)?`${await myMangaTMO.rutaCompleta()}//${ini}.cbr`:`${await myMangaTMO.rutaCompleta()}//${ini}-${await myMangaTMO.numeroUltimoCap()}.cbr`);
					// ESTO ELIMINA LAS CARPETAS DESPUES DE LA COMPRESION
					//await myMangaTMO.eliminarCarpetas();

			    await bot.sendMessage(msg.chat.id,`Descargado ${url.split('/')[6].replace(/-/g,' ')} ✔`, { parse_mode : "HTML"});
							
				}else if(action.split('*')[1] == 'wikicrab'){

			    let url = await ReplyToMessage(msg.chat.id,'<b>Ingrese la url de wikicrab!</b>\n');

					let myMangaWiki = new wiki(disco_duro,url);

					await myMangaWiki.obtenerDOM();

					await myMangaWiki.obtenerDatosManga();

					await myMangaWiki.obtenerCapitulos();

					await bot.sendMessage(msg.chat.id,`<b>${await myMangaWiki.nombreManga()}</b>\n<b>${await myMangaWiki.cantCapitulos()}</b>\n`, { parse_mode : "HTML"});

					const ini = await ReplyToMessage(msg.chat.id,'<b>Donde Comienza</b>\n');
					const fin = await ReplyToMessage(msg.chat.id,'<b>Donde Termina</b>\n');

					myMangaWiki.preguntar(ini,fin);

					await myMangaWiki.descargarImagenes();

					await bot.sendMessage(msg.chat.id,`Descargado ${url.split('/')[4].replace(/-/g,' ')} ✔`, { parse_mode : "HTML"});

				}else if(action.split('*')[1] == 'mi2manga'){

			    let url = await ReplyToMessage(msg.chat.id,'<b>Ingrese la url de mi2manga!</b>\n');

					let myManga2Manga = new mi2manga(disco_duro,url);

					await myManga2Manga.obtenerDOM();

					await myManga2Manga.obtenerDatosManga();

					await myManga2Manga.obtenerCapitulos();

					await bot.sendMessage(msg.chat.id,`<b>${await myManga2Manga.nombreManga()}</b>\n<b>${await myManga2Manga.cantCapitulos()}</b>\n`, { parse_mode : "HTML"});

					const ini = await ReplyToMessage(msg.chat.id,'<b>Donde Comienza</b>\n');
					const fin = await ReplyToMessage(msg.chat.id,'<b>Donde Termina</b>\n');

					myManga2Manga.preguntar(ini,fin);

					await myManga2Manga.descargarImagenes();

					await bot.sendMessage(msg.chat.id,`Descargado ${url.split('/')[4].replace(/-/g,' ')} ✔`, { parse_mode : "HTML"});

				}else if(action.split('*')[1] == '3daos'){

			    let url = await ReplyToMessage(msg.chat.id,'<b>Ingrese la url de 3daos!</b>\n');

					let myMangatresdaos = new tresdaos(disco_duro,url);

					await myMangatresdaos.obtenerDOM();

					await myMangatresdaos.obtenerDatosManga();

					await myMangatresdaos.obtenerCapitulos();

					await bot.sendMessage(msg.chat.id,`<b>${await myMangatresdaos.nombreManga()}</b>\n<b>${await myMangatresdaos.cantCapitulos()}</b>\n`, { parse_mode : "HTML"});

					const ini = await ReplyToMessage(msg.chat.id,'<b>Donde Comienza</b>\n');
					const fin = await ReplyToMessage(msg.chat.id,'<b>Donde Termina</b>\n');

					myMangatresdaos.preguntar(ini,fin);

					await myMangatresdaos.descargarImagenes();

					await bot.sendMessage(msg.chat.id,`Descargado ${url.split('/')[4].replace(/-/g,' ')} ✔`, { parse_mode : "HTML"});

				}

  	break;

  }
  
});