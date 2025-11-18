import { inject, injectable } from "inversify"

import svgToMiniDataURI from 'mini-svg-data-uri'

import Hash from 'ipfs-only-hash'

import { Image } from "../dto/image.js"
import { ImageRepository } from "../repository/image-repository.js"
import { Player } from "../dto/player.js"
import { toSvg } from "jdenticon"

import invert, { RGB, RgbArray, HexColor, BlackWhite } from 'invert-color';
import { City } from "../dto/city.js"
import { Team } from "../dto/team.js"






@injectable()
class ImageService {

  @inject("ImageRepository")
  private imageRepository: ImageRepository

  constructor(
  ) { }

  async get(_id: string, options?:any): Promise<Image> {
    return this.imageRepository.get(_id, options)
  }

  async put(image: Image, options?:any) {
    return this.imageRepository.put(image, options)
  }

  async newFromSvg(svg: string) {

    const image: Image = new Image()

    image.svg = svg
    image.cid = await Hash.of(image.svg)

    return image

  }

  async getUrl(image: Image) {

    if (!image.svg) return ""

    return this.getSVGURL(image)

  }

  async getSVGURL(image: Image) {

    if (!image.svg) return ""
    return this.svgToDataURL(image.svg)

  }

  public bufferToBlob(buffer: Uint8Array): Promise<Blob> {

    if (Blob != undefined) {
      //@ts-ignore
      return new Blob([buffer], { type: "image/jpg" })
    }

  }

  public blobToDataURL(blob): Promise<string> {

    let dataUrl

    return new Promise((resolve, reject) => {

      const fr = new FileReader()

      fr.onload = async function () {
        dataUrl = fr.result
        resolve(dataUrl)
      }

      fr.readAsDataURL(blob)
    })

  }

  public svgToDataURL(svgStr) {
    return svgToMiniDataURI(svgStr)

    // return "data:image/svg+xml;base64," + Buffer.from(svgStr).toString("base64")
  }

  async getImageContent(image: Image) {
    return new TextEncoder().encode(image.svg)
  }

  public async generateImage(player: Player) : Promise<Image> {

    let image:Image = new Image()

    image.svg = this.getSVG(player._id)
    image.cid = await Hash.of(image.svg)

    return image

  }

  public async generateGeneratingImage() : Promise<Image> {

    let image:Image = new Image()

    image.svg = this.getSVG('generating')
    image.cid = await Hash.of(image.svg)

    return image

  }

  public getSVG(_id:string) {

    return toSvg(`${_id}`, 500)


  }

  async createImageFromContent(data, thumbnail60Data, thumbnail100Data, thumbnail1024Data, options?:any) {

      let logo = new Image()
      logo.dataFull = data
      logo.data60x60 = thumbnail60Data
      logo.data100x100 = thumbnail100Data
      logo.data1024x1024 = thumbnail1024Data
      logo.cid = await Hash.of(logo.dataFull)
      logo._id = logo.cid

      let existing = await this.get(logo._id, options)

      if (!existing) {
          existing = await this.put(logo, options)
      }

      return existing
  }


  getRatingClass(rating, averageRating) {

    if (rating - (rating * .80) > averageRating) {
      return "orange-bold"
    } else if (rating > averageRating) {
      return "orange"
    } else if (averageRating - (averageRating * .80) > rating) {
      return "blue-bold"
    } else if (averageRating > rating) {
      return "blue"
    }

  }

  formatRatio (num) {

    // Special case for 0 to format as .000
    if (num === 0) {
        return ".000";
    }

    // Format the number to always have 3 decimal places
    let numStr = num.toFixed(3)

    // Check if the number is less than 1 and greater than -1 but not 0
    if (num < 1 && num > -1 && num !== 0) {
        // Remove the leading 0
        numStr = numStr.replace(/^0/, '')
    }
    // Return the formatted string
    return numStr
  }

  hexToHSL(H) {
    // Convert hex to RGB first
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
      //@ts-ignore
      r = "0x" + H[1] + H[1];
      //@ts-ignore
      g = "0x" + H[2] + H[2];
      //@ts-ignore
      b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
      //@ts-ignore
      r = "0x" + H[1] + H[2];
      //@ts-ignore
      g = "0x" + H[3] + H[4];
      //@ts-ignore
      b = "0x" + H[5] + H[6];
    }
    // Then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;
  
    if (delta == 0)
      h = 0;
    else if (cmax == r)
      h = ((g - b) / delta) % 6;
    else if (cmax == g)
      h = (b - r) / delta + 2;
    else
      h = (r - g) / delta + 4;
  
    h = Math.round(h * 60);
  
    if (h < 0)
      h += 360;
  
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
  
    return {
      h: h,
      s: s,
      l: l
    }

    // return "hsl(" + h + "," + s + "%," + l + "%)";
  }

  invertHex(hex) {
    //@ts-ignore
    let s = invert(hex)

    return s
  }


  getCityTeamLogoSVG(city, team) {

    const leftLetter = city.name[0].toUpperCase()
    const rightLetter = team.name[0].toUpperCase()
    
    const color1 = team.colors.color1; // Left background
    const color2 = team.colors.color2; // Right background
  
    return `
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Background split vertically -->
        <rect x="0" y="0" width="50" height="100" fill="${color1}" />
        <rect x="50" y="0" width="50" height="100" fill="${color2}" />
  
        <!-- Left letter: white fill, gray stroke -->
        <text x="25" y="70" text-anchor="middle"
              font-family="Arial Black, sans-serif"
              font-size="50" font-weight="900"
              fill="${color2}"
              stroke="#7a7a7a" stroke-width="1.5">
          ${leftLetter}
        </text>
  
        <!-- Right letter: same style -->
        <text x="75" y="70" text-anchor="middle"
              font-family="Arial Black, sans-serif"
              font-size="50" font-weight="900"
              fill="${color1}"
              stroke="#7a7a7a" stroke-width="1.5">
          ${rightLetter}
        </text>
      </svg>
    `;
  }
  
  getTeamLogoSVG( team) {

    const leftLetter = team.name[0].toUpperCase()
    
    const color1 = team.colors.color1; // Left background
    const color2 = team.colors.color2; // Right background
  
    return `
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Background split vertically -->
        <rect x="0" y="0" width="100" height="100" fill="${color1}" />  
        
        <!-- Left letter: white fill, gray stroke -->
        <text x="50" y="75" text-anchor="middle"
              font-family="Arial Black, sans-serif"
              font-size="75" font-weight="900"
              fill="${color2}"
              stroke="#7a7a7a" stroke-width="1.5">
          ${leftLetter}
        </text>

      </svg>
    `;
  }

  
  async createCityTeamLogo(city:City, team:Team, options?:any) {

    let logo = new Image()

    logo.svg = this.getCityTeamLogoSVG(city, team)
    logo.cid = await Hash.of(logo.svg)
    logo._id = logo.cid

    let existing = await this.get(logo._id, options)

    if (!existing) {
        existing = await this.put(logo, options)
    }

    return existing
  }

  
  async createTeamLogo(team:Team, options?:any) {

    let logo = new Image()

    logo.svg = this.getTeamLogoSVG(team)
    logo.cid = await Hash.of(logo.svg)
    logo._id = logo.cid

    let existing = await this.get(logo._id, options)

    if (!existing) {
        existing = await this.put(logo, options)
    }

    return existing
  }



}



export {
  ImageService
}

