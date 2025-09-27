const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const fs = require('fs');
const { createWriteStream } = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axiosRetry = require('axios-retry');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

axiosRetry(axios, { retries: 999 });

module.exports = class MangasTMO {
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

  constructor(carpetaPrincipal,url) {
    this.url = url;
    this.carpetaPrincipal = carpetaPrincipal;
  }

  // Métodos
  obtenerDOM(){

    return new Promise( async (resolve,reject) => {

      let config = {
        method: 'get',
        url: this.url,
        headers: { 
          'Referer': "zonatmo.com"
        }
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
        tituloM:limpiarChr($('#app > section > header > section.element-header-content > div.container.h-100 > div > div.col-12.col-md-9.element-header-content-text > h1').text()),
        sinopsis:$('#app > section > header > section.element-header-content > div.container.h-100 > div > div.col-12.col-md-9.element-header-content-text > p.element-description').text().trim(),
        demografia:"",
        url:this.url,
        UltimaFecha:dayjs().format('DD-MM-YYYY'),
        horaActualizacion:dayjs().format('HH:mm:ss')
      }

      this.tituloM = datos.tituloM;
      //this.tituloM = datos.tituloM.replace("                                                                     "," ").trim();

      this.nombreCarpeta = this.url.split('/')[6].replace(/-/g,' ');

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

      let $ = cheerio.load(this.DOM);

      const ul = $('#chapters ul.list-group');

      let capitulos = [];
      ul.each(function (idx, el) {
        const cap = { url: "" };
        if($(el).children("li.list-group-item").children("div").children("div.text-right").children('a').attr('href') != null){
          cap.url = $(el).children("li").children("div").children("div.text-right").children('a').attr('href');
          capitulos.push(cap);
        }
      });
      capitulos.reverse();

      this.capitulos = capitulos;

      resolve();

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

  async numeroUltimoCap(){

  	return new Promise( async (resolve) => {

        let DOM = await obtenerDOM_Local(this.capitulos[this.capitulos.length-1].url);

        let $ = cheerio.load(DOM);

  		resolve(limpiarNombre($('#app > section:nth-child(2) > div > div > h2').text().trim()));

  	})

  }

  async rutaCompleta(){

    return new Promise((resolve) => {

      resolve(`${this.carpetaPrincipal}//${this.nombreCarpeta.trim()}`);

    })

  }

  async descargarImagenes(){

    return new Promise( async (resolve) => {

      if((this.ini+1) == this.fin){

        let DOM = await obtenerDOM_Local(this.capitulos[this.ini].url);

        let $ = cheerio.load(DOM);
        let img_Capitulos = [];
        let ul;

        let nombreCap = limpiarNombre($('#app > section:nth-child(2) > div > div > h2').text().trim());

        //console.log(`Nombre cap: ${nombreCap}`);

        if($('#viewer-container').length == 1) {
          ul = $('#viewer-container > div');
        }else{
          ul = $('#main-container > div');
        }

        ul.each(function (idx, el) {
         img_Capitulos.push($(el).children('img').attr('data-src').replace(/\t/g, "").replace(/\n/g, ""));
        });

        this.carpetasCreadas.push(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`);

        await fs.mkdirSync(`${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`,{recursive:true});

        for(let x=0;x < img_Capitulos.length;x++){
          await bajar_imagen(img_Capitulos[x], `${this.carpetaPrincipal}//${this.nombreCarpeta}//${nombreCap}//`, this.capitulos[this.ini].url, x);
        }

        resolve();

      }else{

        if(this.fin <= this.capitulos.length){

          for(let i=this.ini;i < this.fin;i++){

            await sleep(2000);

            let DOM = await obtenerDOM_Local(this.capitulos[i].url);

            let $ = cheerio.load(DOM);
            let img_Capitulos = [];
            let ul;

            let nombreCap = limpiarNombre($('#app > section:nth-child(2) > div > div > h2').text().trim());

            //console.log(`Nombre cap: ${nombreCap} ---- indice: ${i}`);

            if($('#viewer-container').length == 1) {
              ul = $('#viewer-container > div');
            }else{
              ul = $('#main-container > div');
            }

            ul.each(function (idx, el) {
             img_Capitulos.push($(el).children('img').attr('data-src').replace(/\t/g, "").replace(/\n/g, ""));
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

  async comprimir(ruta,nombre){

    //const nombreArchivoSalida = `${ruta}//${nombre}.cbr`;

    comprimirCarpetas(ruta,nombre)

    /*await comprimirCarpetas(this.carpetasCreadas, nombreArchivoSalida)
    .then(() => {
        console.log('Carpetas comprimidas con éxito.');
    })
    .catch(err => {
        console.error('Error al comprimir carpetas:', err);
    });*/

  }

  async eliminarCarpetas() {
      
      for(let i=0;i < this.carpetasCreadas.length; i++){

         await fs.rmSync(this.carpetasCreadas[i], { recursive: true });

      }

      console.log('carpetas eliminadas sin problemas');

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
        url: $('#app > section > header > section.element-header-content > div.container.h-100 > div > div.col-12.col-md-3.text-center > div > img').attr('src'),
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
      responseType: 'stream',
      headers: { 
        'Referer': referencia
      }
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
    throw error;
  }

}

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}

function obtenerDOM_Local(url){

    return new Promise( async (resolve,reject) => {

      let config = {
        method: 'get',
        url: url,
        headers: { 
          'Referer': "zonatmo.com"
        }
      };

      await axios(config)
      .then( async (res) => {

        if(res.request.path.includes('/paginated')){

          await sleep(1200);

          config.url = 'https://zonatmo.com'+res.request.path.replace('paginated','cascade');

          await axios(config)
          .then((res) => {

            resolve(res.data);
            
          })
          .catch(function (error) {
            reject();
            console.log(error);
          });    

        }else{

          resolve(res.data)

        }
        
      })
      .catch(function (error) {
        reject();
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

  //text = text.replace(/^[0-9]{2}\.[0-9]{2}$/, "");
  //text = text.replace("..", "");
  /*text = text.replace("í", "i");
  text = text.replace("ó", "o");
  text = text.replace("ñ", "n");
  text = text.replace("á", "a");
  text = text.replace("Subido por", "");
  text = text.replace(':3','');
  text = text.replace(':','');
  text = text.replace('♪','');
  text = text.replace('""','');
  text = text.replace('"','');*/
  //return text.replace(/[^0-9. ]/g, "").trim();
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

/*function comprimirCarpetas(rutasCarpetas, nombreArchivoSalida) {
    return new Promise((resolve, reject) => {

        const zip = new AdmZip();

        for(let i=0;i<rutasCarpetas.length;i++){

            const stats = fs.statSync(rutasCarpetas[i]);
            if (stats.isDirectory()) {
                const carpetaNombres = rutasCarpetas[i].split(path.sep);
                const nombreCarpeta = carpetaNombres[carpetaNombres.length - 1];
                zip.addLocalFolder(rutasCarpetas[i], nombreCarpeta);
            } else {
                console.error(`${rutasCarpetas[i]} no es una carpeta válida.`);
            }

        }

        zip.writeZip(nombreArchivoSalida);

        resolve();

    });
}*/

function comprimirCarpetas(directorio,nombreArchivoSalida) {
    // Lista de archivos en el directorio
    const archivos = fs.readdirSync(directorio);

    // Filtrar solo las carpetas
    const carpetas = archivos.filter(nombreArchivo => fs.statSync(path.join(directorio, nombreArchivo)).isDirectory());

    // Crear un archivo zip
    const zip = new AdmZip();

    // Recorrer cada carpeta y agregar su contenido al zip
    carpetas.forEach(nombreCarpeta => {
        const rutaCarpeta = path.join(directorio, nombreCarpeta);
        const archivosCarpeta = fs.readdirSync(rutaCarpeta);
        archivosCarpeta.forEach(archivo => {
            const rutaArchivo = path.join(rutaCarpeta, archivo);
            // Si el archivo es un directorio, no hacer nada (ya se agregará su contenido)
            if (fs.statSync(rutaArchivo).isDirectory()) {
                return;
            }
            // Si el archivo no está directamente en el directorio pasado como parámetro, agregarlo al zip
            if (path.dirname(rutaArchivo) !== directorio) {
                zip.addLocalFile(rutaArchivo, path.join(nombreCarpeta, archivo));
            }
        });
    });

    // Guardar el archivo zip
    zip.writeZip(nombreArchivoSalida);
}