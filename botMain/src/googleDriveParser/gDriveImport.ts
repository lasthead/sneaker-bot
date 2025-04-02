import {ImportParams, ProductInterface} from "./interfaces";
const fs = require('fs');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const StreamZip = require('node-stream-zip');

import {tableParser} from "./tableParser";

const availableEntries = [
  'Jordan.html',
  'SB (Nike).html',
  'NB.html',
  'AF1.html',
  'Nike.html',
  'Adidas.html',
  'YEEZY.html',
  'Др. бренды.html',
  'AF1 SHADOW.html',
]

const stringFormatter = (str: string): string => {
  return str.trim().replace(' ', '').toLowerCase();
}

const readZipFile = async (filename) => {
  let dataList = []
  const zip = new StreamZip.async({
    file: filename,
    storeEntries: true
  });
  const entries = await zip.entries();

  for (const entry of Object.values(entries)) {
    // @ts-ignore
    if (availableEntries.find(o => stringFormatter(o) === stringFormatter(entry.name))) {
      // @ts-ignore
      if (entry.name.includes('html')) {
        const dataEntry = await zip.entryData(entry);
        // @ts-ignore
        const res = await tableParser(entry.name, dataEntry);
        dataList = [
          ...dataList,
          ...res,
        ]
      }
    }
  }
  await zip.close();
  return dataList;
}

const runShellScript = async (script) => {
  const { stdout, stderr, error } = await exec(script);
  const result = {
    status: true,
    error: undefined,
    stderr: undefined,
    result: undefined
  };

  if (error) {
    result.status = false;
    result.error = error.message;
  }

  if (stderr) {
    result.status = false;
    result.stderr = stderr;
  }
  if(stdout){
    result.result = stdout;
  }

  return result;
}

export const initImport = async (params: ImportParams, debug = false): Promise<ProductInterface[]> => {
  const initParams: ImportParams = {
    downloadScriptPath: "./src/googleDriveParser/gDriveDownloader.py",
    outputFilePath: "./docs/new_price.zip",
    ...params,
  }

  const scriptStatus = await runShellScript(`python3.9 ${initParams.downloadScriptPath} ${initParams.outputFilePath} ${initParams.fileId}`);
  if (scriptStatus?.status === true) {
    const data = await readZipFile(initParams.outputFilePath);

    if (debug) {
      fs.writeFileSync('resData.json', JSON.stringify(data));
    } else {
      return data;
    }
  } else {
    console.error(scriptStatus);
    return [];
  }
}
