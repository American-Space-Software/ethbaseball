import { inject, injectable } from "inversify";
import { QuillDeltaToHtmlConverter } from "quill-delta-to-html"
import { Post } from "../../dto/post.js";
import axios from "axios";



@injectable()
class PostWebService {

    constructor(
    ) {}

    async get(_id: number) {

        let result = await axios.get(`/post/${_id}`)

        return result.data
    }

    translateContent(post:Post, suppressSrc:boolean=false): string {

        if (!post.content?.ops) return ""

        const qdc = new QuillDeltaToHtmlConverter(post.content.ops, { 
          encodeHtml: false,
          customCssClasses: (op) => {
            if (op.attributes.link) {
              return ['external']
            }
          },
        })

        //Render dividers into HTML
        qdc.renderCustomWith(renderCustom(suppressSrc))

        return qdc.convert()
    }

    translateShort(post:Post, suppressSrc:boolean=false): string {

        if (!post.short?.ops) return ""

        const qdc = new QuillDeltaToHtmlConverter(post.short.ops, { 
          encodeHtml: false,
          customCssClasses: (op) => {
            if (op.attributes.link) {
              return ['external']
            }
          },
        })

        //Render dividers into HTML
        qdc.renderCustomWith(renderCustom(suppressSrc))

        let html = qdc.convert()

        html += `<div class="read-more"><a class="button button-outline" href="/news?newsId=${post._id}">Read more...</span></div>`

        return html


    }

}


const renderCustom = (suppressSrc) => {

  return function (customOp, contextOp) {

    if (customOp.insert.type === 'divider') {
      return "<hr />"
    }
  
    if (customOp.insert.type === 'ipfsimage') {
      
      let img = `<img `
  
      if (!suppressSrc) {
        img += `src="${customOp.insert.value.src}" `
      }
  
      
      if (customOp.insert.value.width) {
        img += `width="${customOp.insert.value.width}" `
      }
  
      if (customOp.insert.value.height) {
        img += `height="${customOp.insert.value.height}" `
      }
  
      if (customOp.insert.value.style) {
        img += `style="${customOp.insert.value.style}"`
      }
  
      img += "/>"
  
      return img
    }
  
  }



}

export {
    PostWebService
}