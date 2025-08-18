import { Helia } from "helia";
import { inject, injectable } from "inversify";
import fs from "fs"
import path from "path"

import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import { balanced } from 'ipfs-unixfs-importer/layout'
import { CID, CarWriter } from '@ipld/car/writer'
import { CarBlockIterator, CarIteratorBase } from '@ipld/car/iterator'

//To solve a weird Webpack/build problem where this class isn't included in the build for some reason but it is required.
let webpackFix = CarIteratorBase.toString() //I hate this solution please someone figure out how to fix this in webpack or the library directly


import { MFS, mfs } from "@helia/mfs"
import { car } from '@helia/car'

import { CarIndexedReader } from '@ipld/car'
import { recursive as exporter } from 'ipfs-unixfs-exporter'

@injectable()
class IPFSService {

  _helia: Helia

  private _mfs: MFS
  private _car


  private mfsOptions = {
    // these are the default kubo options
    cidVersion: 0,
    rawLeaves: false,
    layout: balanced({
      maxChildrenPerNode: 174
    }),
    chunker: fixedSize({
      chunkSize: 262144
    }),
    force: true
  }


  constructor(
    @inject("helia") private helia: Function
  ) { 


  }

  async init() {
    this._helia = await this.helia()

    this._mfs = mfs(this._helia)
    this._car = car(this._helia)
  }


  async heliaRm(path: string, options?: any) {
    return this._mfs.rm(path, options)
  }

  async heliaMFSWrite(content: Uint8Array, path: string, options?: any){
    return this._mfs.writeBytes(content, path, Object.assign(this.mfsOptions, options))
  }


  async heliaAdd(content: Uint8Array, path: string, options?: any): Promise<CID> {

    await this._mfs.writeBytes(content, path, Object.assign(this.mfsOptions, options))

    let stat = await this._mfs.stat(path)

    return stat.cid

  }

  async heliaMkDir(path: string, options?: any) {
    return this._mfs.mkdir(path, Object.assign(this.mfsOptions, options))
  }

  async heliaStat(path: string, options?: any) {
    return this._mfs.stat(path, Object.assign(this.mfsOptions, options))
  }

  async createCAR(rootCID: CID) {
    console.log("Creating CAR file export...")
    return CarWriter.create(rootCID)
  }

  async exportCAR(rootCID: CID, writer) {
    return this._car.export(rootCID, writer)
  }

  async carWriterOutToBlob(carReaderIterable) {
    const parts = []
    for await (const part of carReaderIterable) {
      parts.push(part)
    }
    return new Blob(parts, { type: 'application/car' })
  }

  async writeCAR(carPath: string, rootFolder: string) {

    const reader = await CarIndexedReader.fromFile(carPath)
    const roots = await reader.getRoots()

    const entries = exporter(roots[0], {
      async get(cid) {
        const block = await reader.get(cid)
        return block.bytes
      }
    })


    for await (const entry of entries) {

      // Split the path into parts using '/'
      let parts = entry.path.split('/')

      // Remove the first folder (element at index 0)
      parts.shift()

      // Join the remaining parts back into a string
      let resultPath = `${rootFolder}/${parts.join('/')}`


      if (!fs.existsSync(path.dirname(resultPath))) {
        fs.mkdirSync(path.dirname(resultPath), { recursive: true })
      }

      if (entry.type === 'file' || entry.type === 'raw') {

        let chunks = []

        for await (const chunk of entry.content()) {
          chunks.push(chunk)
        }


        const buf = Buffer.concat(chunks)
        fs.writeFileSync(resultPath, new Uint8Array(buf))

        // fs.writeFileSync(resultPath, Buffer.concat(chunks) as Buffer)

      }
    }
  }


}


export {
  IPFSService
}