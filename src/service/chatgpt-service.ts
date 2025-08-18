import { inject, injectable } from "inversify";


@injectable()
class ChatGPTService {

    constructor(
        @inject("chatGPTAPI") private chatGPTAPI,
        @inject("openai") private openai
    ) { }

      
    async generateLogo(cityName, teamName, chosenStyle, color1, color2) {

        const prompt = `
            Create a complete SVG file for a fantasy baseball team logo.

            City Name: ${cityName}
            Team Name: ${teamName}
            Mascot: a stylized, bold ${teamName} — simplified silhouette or abstract form
            Colors: ${color1} and ${color2}
            Style: ${chosenStyle.style} — ${chosenStyle.description}

            Layout:
            - Circular badge layout (viewBox="0 0 512 512")
            - Centered mascot shape (keep it symmetrical and recognizable)
            - Crossed baseball bats behind the mascot
            - A baseball icon (optional) near the center or layered in
            - Team name "${teamName}" in bold, uppercase sans-serif font, centered or curved
            - Balanced design with contrast between background and foreground
            - Use only vector shapes and text, no external assets or gradients

            Instructions:
            - Output only valid standalone SVG code with <svg> root tag
            - No explanations, markdown, or comments
            - Make sure it renders cleanly when pasted into an HTML file
            `;
        
        const chatResponse = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are an SVG designer that outputs only complete standalone SVG files." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });
        
        const svg = chatResponse.choices[0].message.content.trim()

        function extractSVG(content) {
            const start = content.indexOf('<svg')
            const end = content.indexOf('</svg>')
            
            if (start !== -1 && end !== -1) {
                return content.slice(start, end + 6); // 6 = length of "</svg>"
            } else {
                throw new Error("No valid <svg>...</svg> found in GPT output.")
            }
        }



        return extractSVG(svg)
    }
      


}



// Logo style options
const LOGO_STYLES = [
{
    style: "bold and modern",
    description: "sharp lines, sleek design, aggressive energy"
},
{
    style: "classic sports emblem",
    description: "badge-style, shield or crest layout, professional sports vibe"
},
{
    style: "mascot-focused",
    description: "central character illustration, full of personality or power"
},
{
    style: "retro or vintage",
    description: "old-school textures, fonts from the 70s-80s, nostalgic feel"
}
  ]

export {
    ChatGPTService, LOGO_STYLES
}