const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const fs = require('fs');
const { createWriteStream } = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axiosRetry = require('axios-retry');
const FormData = require('form-data');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

axiosRetry(axios, { retries: 999 });

module.exports = class MangasWIKI {
  // Propiedades
  url = "";
  carpetaPrincipal = "";
  nombreCarpeta = "";
  DOM = "";
  capitulos = [];
  tituloM = "";
  ini = 0;
  fin = 0;
  carpetasCreadas = [];
  id = 0;

  constructor(carpetaPrincipal,url) {
    this.url = url;
    this.carpetaPrincipal = carpetaPrincipal;
  }

  // Métodos
  obtenerDOM(){

    return new Promise( async (resolve,reject) => {

      let config = {
        method: 'get',
        url: this.url
      };

      await axios(config)
      .then( async (res) => {

        this.DOM = res.data
        resolve()
        
      })
      .catch(function (error) {
        reject();
        console.log(error);
      });

    });

  }

  obtenerDatosManga(){

    return new Promise( async (resolve,reject) => {

      let $ = cheerio.load(this.DOM);

      let datos = {
        tituloM:limpiarChr($('#manga-header > div.Detallesnew > div > div.caps > h1:nth-child(1) > div.titulodetalles').text()),
        sinopsis:$('#sinopsis > div.sinopsis-inicial > p').text().trim(),
        demografia:"",
        url:this.url,
        UltimaFecha:dayjs().format('DD-MM-YYYY'),
        horaActualizacion:dayjs().format('HH:mm:ss')
      }

      this.tituloM = datos.tituloM;
      //this.tituloM = datos.tituloM.replace("                                                                     "," ").trim();

      this.nombreCarpeta = this.url.split('/')[4].replace(/-/g,' ');
      this.id = $('#manga-title > div.tab-summary > div > div.post-rating > input').attr('value');

      await fs.mkdirSync(`${this.carpetaPrincipal}//${this.nombreCarpeta.trim()}`,{recursive:true});

      await fs.writeFile(`${this.carpetaPrincipal}//`+this.nombreCarpeta.trim()+'//DatosManga.json', JSON.stringify(datos, null, 2), function (err) {
        if(err){console.log(err);} 
      });

      descargarIMG(this.DOM,`${this.carpetaPrincipal}//${this.nombreCarpeta.trim()}//ico.png`);

      resolve();

    })

  }

  obtenerCapitulos(){

    return new Promise( async (resolve,reject) => {


      let data = new FormData();
      data.append('action', 'manga_get_chapters');
      data.append('manga', this.id);

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://wikicrab.xyz/wp-admin/admin-ajax.php',
        headers: { 
          ...data.getHeaders()
        },
        data : data
      };

      axios.request(config)
      .then((response) => {

        let $ = cheerio.load(response.data);

        const ul = $('ul.main > li');

        let capitulos = [];
        ul.each(function (idx, el) {

          const cap = { url: "" };

          cap.url = $(el).children('a').attr('href');
          capitulos.push(cap);

        });

        capitulos.reverse();

        this.capitulos = capitulos;

        resolve();

      })
      .catch((error) => {
        console.log(error);
      });

    })

  }

  async preguntar(ini,fin){

    console.log(`Manga: ${this.tituloM}`);
    console.log(`Cantidad Capitulos: ${this.capitulos.length}`);

    this.ini = Number(ini)-1
    this.fin = Number(fin)

  }

  async nombreManga(){

    return `Manga: ${this.tituloM}`;

  }

  async cantCapitulos(){

    return `Capitulos: ${this.capitulos.length}`;

  }

  async descargarImagenes(){

    return new Promise( async (resolve) => {

      if((this.ini+1) == this.fin){

        let DOM = await obtenerDOM_Local(this.capitulos[this.ini].url);

        let $ = cheerio.load(DOM);
        let img_Capitulos = [];
        let ul;

        let nombreCap = limpiarNombre($('#manga-reading-nav-head > div > div.entry-header_wrap > div > div.c-breadcrumb > ol > li.active').text().trim());

        ul = $('div.reading-content > div.lector > div.page-break');

        ul.each(function (idx, el) {
         img_Capitulos.push($(el).children('img').attr('src').replace(/\t/g, "").replace(/\n/g, ""));
        });

        this.carpetasCreadas.push(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`);

        console.log(`Nombre cap: ${nombreCap}`);

        await fs.mkdirSync(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`,{recursive:true});

        for(let x=0;x < img_Capitulos.length;x++){
          await bajar_imagen(img_Capitulos[x], `${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`, this.capitulos[this.ini].url, x);
        }

        resolve();

      }else{

        if(this.fin <= this.capitulos.length){

          for(let i=this.ini;i < this.fin;i++){

            await sleep(800);

            let DOM = await obtenerDOM_Local(this.capitulos[i].url);

            let $ = cheerio.load(DOM);
            let img_Capitulos = [];
            let ul;

            let nombreCap = limpiarNombre($('#manga-reading-nav-head > div > div.entry-header_wrap > div > div.c-breadcrumb > ol > li.active').text().trim());

            console.log(`Nombre cap: ${nombreCap} ---- indice: ${i}`);

            ul = $('div.reading-content > div.lector > div.page-break');

            ul.each(function (idx, el) {
             img_Capitulos.push($(el).children('img').attr('src').replace(/\t/g, "").replace(/\n/g, ""));
            });

            this.carpetasCreadas.push(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`);

            await fs.mkdirSync(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}`,{recursive:true});

            for(let x=0;x < img_Capitulos.length; x++){
              await bajar_imagen(img_Capitulos[x], `${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`, this.capitulos[i].url, x);
            }

          }

        }

        resolve();

      }

    });

  }

}

// Funciones extras
function limpiarChr(text){

  text = text.replace(/\n|\r|\t/g, "");
  text = text.replace("í", "i");
  text = text.replace("ó", "o");
  text = text.replace("ñ", "n");
  text = text.replace("á", "a");
  text = text.replace(".", "");
  text = text.replace("Subido por", "");
  return text.replace(/[^a-zA-Z0-9  ]/g, "").trim();

}

function descargarIMG(DOM,name){

  return new Promise( async resolve => {

    const $ = cheerio.load(DOM);

    try {
      const respuesta = await axios({
        method: 'GET',
        url: $('#miniatura > a > img').attr('src'),
        responseType: 'stream'
      });

      // Crea un stream de escritura hacia el archivo de destino
      const archivoDestino = fs.createWriteStream(name);

      // Piping de la respuesta (stream de lectura) al archivo de destino (stream de escritura)
      respuesta.data.pipe(archivoDestino);

      // Retorna una promesa que se resolverá cuando la descarga esté completa
      return new Promise((resolve, reject) => {
        archivoDestino.on('finish', () => {
          resolve();
        });

        archivoDestino.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      throw error;
    }

  });

}

async function bajar_imagen(fileUrl, downloadFolder , referencia, indice){

  try {

    const respuesta = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });

    // Crea un stream de escritura hacia el archivo de destino
    const archivoDestino = fs.createWriteStream(downloadFolder+indice+`.${fileUrl.split('.').pop()}`);

    // Piping de la respuesta (stream de lectura) al archivo de destino (stream de escritura)
    respuesta.data.pipe(archivoDestino);

    // Retorna una promesa que se resolverá cuando la descarga esté completa
    return new Promise((resolve, reject) => {
      archivoDestino.on('finish', () => {
        resolve();
      });

      archivoDestino.on('error', (error) => {
        reject(error);
      });
    });

  } catch (error) {
    //throw error;
    console.log('imagen no encontrada!');
  }

}

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}

function obtenerDOM_Local(url){

    return new Promise( async (resolve,reject) => {

      let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url
      };

      axios.request(config)
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        console.log(error);
      });

    });

}

function limpiarNombre(text){

  text = text.replace(/\n|\r|\t /g, "");

  text = text.replace(/[^0-9.]/g,'')

  text = text.replace("......", "");
  text = text.replace("......", "");
  text = text.replace(".....", "");
  text = text.replace("....", "");
  text = text.replace("...", "");
  text = text.replace("..", "");

  if(text.endsWith('.')){
    text = text.slice(0, -1);
  }

  return text.trim();

}

function limpiarChr(text){

  text = text.replace(/\n|\r|\t/g, "");
  text = text.replace("í", "i");
  text = text.replace("ó", "o");
  text = text.replace("ñ", "n");
  text = text.replace("á", "a");
  text = text.replace(".", "");
  text = text.replace("Subido por", "");
  return text.replace(/[^a-zA-Z0-9  ]/g, "").trim();

}