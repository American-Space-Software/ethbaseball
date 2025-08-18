import { inject, injectable } from "inversify"
import { Animation } from "../dto/animation.js"

import Hash from 'ipfs-only-hash'

import juice from "juice"
import { AnimationRepository } from "../repository/animation-repository.js";
import { Player } from "../dto/player.js";
import { Image } from "../dto/image.js";

import { PlayerService } from "./player-service.js";
import { HitResult } from "../dto/game-hit-result.js";
import { PitchResult } from "../dto/game-pitch-result.js";
import { StatService } from "./stat-service.js";
import { HitterStatLine, HittingRatings, PitchRatings, PitchType, PitcherStatLine } from "./enums.js";
import { ImageService } from "./image-service.js";


@injectable()
class AnimationService {

  @inject("AnimationRepository")
  private animationRepository:AnimationRepository

  constructor(
    @inject("eta") private eta,
    private statService:StatService,
    private playerService:PlayerService,
    private imageService:ImageService
  ) { }

  async get(_id: string, options?:any): Promise<Animation> {
    return this.animationRepository.get(_id, options)
  }

  async put(animation: Animation, options?:any) {
    return this.animationRepository.put(animation, options)
  }



  public async newFromText(content) {
  
    const animation: Animation = new Animation()
    animation.content = content
    
    animation.cid = await Hash.of(animation.content)


    return animation

  }

  public async generateAnimation(player:Player) : Promise<Animation> {

    let careerHitterStats: HitterStatLine = player.careerStats.hitting
    let careerPitcherStats: PitcherStatLine = player.careerStats.pitching

    // let careerSeasonsHitResult:HitResult[] = await this.playerService.getCareerSeasonsHitResult(player._id)
    // let careerSeasonsPitchResult:PitchResult[] = await this.playerService.getCareerSeasonsPitchResult(player._id)

    //Image
    // let image:Image = await this.imageService.generateImage(player)

    // let content = await this.buildAnimationPage(player, image, careerHitterStats, careerPitcherStats, careerSeasonsHitResult, careerSeasonsPitchResult, this.playerService)

    const animation: Animation = new Animation()
    // animation.content = content
    // animation.cid = await Hash.of(animation.content)

    return animation

  }

  private async buildAnimationPage(player:Player, image:Image, careerHitterStats:HitterStatLine, careerPitcherStats:PitcherStatLine, careerSeasonsHitResult:HitResult[], careerSeasonsPitchResult:PitchResult[], playerService:PlayerService) :Promise<string> {
    return juice(await this.getAnimationTemplate(player, image, careerHitterStats, careerPitcherStats, careerSeasonsHitResult, careerSeasonsPitchResult, playerService))

  }

  async getAnimationTemplate(player:Player,  image:Image,  careerHitterStats:HitterStatLine, careerPitcherStats:PitcherStatLine, careerSeasonsHitResult:HitResult[], careerSeasonsPitchResult:PitchResult[], playerService:PlayerService) {

    return this.eta.renderString(TEMPLATE, {
      image: image.svg.replace('width="500"', 'width="100"').replace('height="500"', 'height="100"'),
      player: player,
      playerService: playerService,
      statService: this.statService,
      careerHitterStats: careerHitterStats,
      careerPitcherStats: careerPitcherStats,
      careerSeasonsHitResult: careerSeasonsHitResult,
      careerSeasonsPitchResult: careerSeasonsPitchResult,
      PitchType: JSON.stringify(PitchType)
    })

  }


  public async generateGeneratingAnimation() : Promise<Animation> {
    
    const animation: Animation = new Animation()
    animation.content = await juice(await this.eta.renderString(GENERATING_TEMPLATE, {}))
    animation.cid = await Hash.of(animation.content)

    return animation

  }


}

const TEMPLATE = `
<%
    let image = it.image
    let player = it.player
    let playerService = it.playerService
    let statService = it.statService
    let PitchType = JSON.parse(it.PitchType)
    let careerHitterStats = it.careerHitterStats
    let careerPitcherStats = it.careerPitcherStats
    let careerSeasonsHitResult = it.careerSeasonsHitResult
    let careerSeasonsPitchResult = it.careerSeasonsPitchResult

    const formatRatio = (num) => {

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

%>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= player.fullName %> #<%= player._id %></title>
    <style>
        body {
            font-size: 15px;
            font-family: sans-serif;
            padding: 5px;
            box-sizing: border-box;
            overflow: auto;
            background: white;
        }

        .center {
            text-align: center;
        }

        .profilePic {
            height: 100px;
            width: 100px;
            float: left;
            border: 1px solid #cccccc;
            margin-right: 10px;
        }

        .name {
            font-size: 24px;
            font-weight: 700;
        }

        strong {
            font-weight: 700;
        }

        .header {
            text-align: left;
            width: 100%;
            padding-bottom: 15px;
        }

        .info {
            width: 250px;
        }

        .note {
            margin-top: 5px;
            margin-bottom: 5px;
            font-weight: 700;
            text-align: left;
        }

        .main h2 {
            font-size: 17px;
            background: #eee;
            color: #030e1c;
            padding: 0px;
            margin: 0 0 0px 0;
            
        }

        table {
            border: 1px solid #cccccc;
            border-collapse: collapse;
            border-spacing: 0;
            margin-top: 5px;
        }

        th {
            font-weight: bold;
            color: #030e1c;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 3px;
        }


        .skills {
            font-size: 13px;
            width: 100%;
            margin-bottom: 10px;
        }

        .skills table {
          background: #ffffff;
        }

        .stats {
          width: 100%;
          max-width: 100%;
          font-size: 11px;
        }

        .stats th, .skills th {
            color: #030e1c;
            background: #eee;
            text-align: center;
            white-space: nowrap;
        }

        .skill th, .skills td {
          padding: 2px;
          width: 40px;
        }
        
        .stats td {
            text-align: right;
            padding: 2px;
            border: 1px solid #ddd;
            background: #ffffff;
            white-space: nowrap;
        }

        .skills td {
          text-align: center;
        }

        .skill-bar {
            width: 100%;
            display: flex;
            font-size: 11px;
            color: white;
            background: #cccccc;
            margin-bottom: 3px;
            white-space: nowrap;
        }

        .skill-bar .green  {
            background: #007a06;
            padding: 2px;
        }

        .skill-bar .dark-green  {
            background: #043b00;
            padding: 2px;
        }

        .skill-bar .red {
            background: #7a1d00;
            padding: 2px;
        }

        .skill-bar .light-red {
            background: #c62f00;
            padding: 2px;
        }

        .skill-bar .blue  {
            background: #02007a;
            padding: 2px;
        }

        .skill-bar.handedness {
            margin-bottom: 0px;
        }

        .contactProfile {
            width: 100%;
            height: 15px;
            font-size: 11px;
            display: flex;
            color: white;
        }

        .gb {
            background: #7a1d00;
            padding: 2px;
        }

        .fb {
            background: #02007a;
            padding: 2px;
        }

        .ld {
            background: #007a06;
            padding: 2px;
        }

        .rating-table {
            display: flex;
        }

        .left {
            flex-basis: 50%;
            padding: 3px;
        }

        .right {
            flex-basis: 50%;
            padding: 3px;
        }

        .wrapper {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
        }


        .wrapper .left, .wrapper .right {
            padding: 0px;
        }

        .label {
            flex: 0 0 100%;
            text-align: left;
            font-weight: bold;
        }


    </style>
</head>

<body>

    <div class="header">

        <div class="profilePic">
            <%= image %>
        </div>    

        <span class="name"><%= player.fullName %></span><br />
        <span><strong>Position:</strong> <%= playerService.getPositionFull(player.primaryPosition) %></span><br />
        <span><strong>Bats:</strong> <%= playerService.getHandednessFull(player.hits) %> • <strong>Throws:</strong>
            <%= playerService.getHandednessFull(player.throws) %></span><br />
        <span><strong>Age:</strong> <%= player.age %> • <strong>Zodiac:</strong> <%= player.zodiacSign %></span><br />
        <span><strong>Overall Rating:</strong> <%= player.overallRating.toFixed(2) %></span>

    </div>

    <div class="main">

        <div class="skills">

           <% if (player.primaryPosition != "P") { %>

              <div class="note">Hitting Ratings</div>

              <div class="rating-table">
                <div class="left">
                
                    <div class="wrapper">
                        <div class="label">Speed</div>
                        <div class="skill-bar">
                            <div class="red center" style="flex-basis: <%= player.hittingRatings.speed %>%;"><%= player.hittingRatings.speed %></div>
                        </div>
                    </div>

                    <div class="wrapper">
                        <div class="label">Steals</div>
                        <div class="skill-bar">
                            <div class="red center" style="flex-basis: <%= player.hittingRatings.steals %>%;"><%= player.hittingRatings.steals %></div>
                        </div>
                    </div>

                    <div class="wrapper">
                        <div class="label">Defense</div>
                        <div class="skill-bar">
                            <div class="red center" style="flex-basis: <%= player.hittingRatings.defense %>%;"><%= player.hittingRatings.defense %></div>
                        </div>
                    </div>

                    <div class="wrapper">
                        <div class="label">Arm</div>
                        <div class="skill-bar">
                            <div class="red center" style="flex-basis: <%= player.hittingRatings.arm %>%;"><%= player.hittingRatings.arm %></div>
                        </div>
                    </div>

                    <div class="wrapper">

                        <div class="label">Contact Profile</div>

                        <div class="skill-bar handedness">
                            <div class="red center" style="flex-basis:<%= player.hittingRatings.contactProfile.groundball / 10 %>%;"><strong>GB</strong> <%= player.hittingRatings.contactProfile.groundball  / 10%></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="blue center" style="flex-basis:<%= player.hittingRatings.contactProfile.flyBall / 10 %>%;"><strong>FB</strong> <%= player.hittingRatings.contactProfile.flyBall / 10 %></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="green center" style="flex-basis:<%= player.hittingRatings.contactProfile.lineDrive / 10 %>%;"><strong>LD</strong> <%= player.hittingRatings.contactProfile.lineDrive  / 10%></div>
                        </div>

                    </div>


                </div>
                <div class="right">
                
                    <div class="wrapper">
                        <div class="label">Contact</div>

                        <div class="skill-bar handedness">
                            <div class="red center" style="flex-basis:<%= player.hittingRatings.vsL.contact %>%;"><strong>L</strong> <%= player.hittingRatings.vsL.contact %></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="light-red center" style="flex-basis:<%= player.hittingRatings.vsR.contact %>%;"><strong>R</strong> <%= player.hittingRatings.vsR.contact %></div>
                        </div>

                    </div>

                    <div class="wrapper">
                        <div class="label">Gap Power</div>

                        <div class="skill-bar handedness">
                            <div class="red center" style="flex-basis:<%= player.hittingRatings.vsL.gapPower %>%;"><strong>L</strong> <%= player.hittingRatings.vsL.gapPower %></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="light-red center" style="flex-basis:<%= player.hittingRatings.vsR.gapPower %>%;"><strong>R</strong> <%= player.hittingRatings.vsR.gapPower %></div>
                        </div>

                    </div>

                    <div class="wrapper">
                        <div class="label">Home Run</div>

                        <div class="skill-bar handedness">
                            <div class="red center" style="flex-basis:<%= player.hittingRatings.vsL.homerunPower %>%;"><strong>L</strong> <%= player.hittingRatings.vsL.homerunPower %></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="light-red center" style="flex-basis:<%= player.hittingRatings.vsR.homerunPower %>%;"><strong>R</strong> <%= player.hittingRatings.vsR.homerunPower %></div>
                        </div>

                    </div>


                    <div class="wrapper">
                        <div class="label">Plate Discipline</div>

                        <div class="skill-bar handedness">
                            <div class="red center" style="flex-basis:<%= player.hittingRatings.vsL.plateDiscipline %>%;"><strong>L</strong> <%= player.hittingRatings.vsL.plateDiscipline %></div>
                        </div>

                        <div class="skill-bar handedness">
                            <div class="light-red center" style="flex-basis:<%= player.hittingRatings.vsR.plateDiscipline %>%;"><strong>R</strong> <%= player.hittingRatings.vsR.plateDiscipline %></div>
                        </div>

                    </div>

                </div>
              </div>





            <% } %>

            <% if (player.primaryPosition == "P") { %>

                <div class="note">Pitching Ratings</div>

                <div class="rating-table">
                    <div class="left">
                    
                        <div class="wrapper">
                            <div class="label">Power</div>
                            <div class="skill-bar">
                                <div class="red center" style="flex-basis: <%= player.pitchRatings.power %>%;"><%= player.pitchRatings.power %></div>
                            </div>
                        </div>

                        <div class="wrapper">
                            <div class="label">Control</div>

                            <div class="skill-bar handedness">
                                <div class="red center" style="flex-basis:<%= player.pitchRatings.vsL.control %>%;"><strong>L</strong> <%= player.pitchRatings.vsL.control %></div>
                            </div>

                            <div class="skill-bar handedness">
                                <div class="light-red center" style="flex-basis:<%= player.pitchRatings.vsR.control %>%;"><strong>R</strong> <%= player.pitchRatings.vsR.control %></div>
                            </div>

                        </div>

                        <div class="wrapper">
                            <div class="label">Movement</div>

                            <div class="skill-bar handedness">
                                <div class="red center" style="flex-basis:<%= player.pitchRatings.vsL.movement %>%;"><strong>L</strong> <%= player.pitchRatings.vsL.movement %></div>
                            </div>

                            <div class="skill-bar handedness">
                                <div class="light-red center" style="flex-basis:<%= player.pitchRatings.vsR.movement %>%;"><strong>R</strong> <%= player.pitchRatings.vsR.movement %></div>
                            </div>

                        </div>


                        <div class="wrapper">

                            <div class="label">Contact Profile</div>

                            <div class="skill-bar handedness">
                                <div class="red center" style="flex-basis:<%= player.pitchRatings.contactProfile.groundball / 10 %>%;"><strong>GB</strong> <%= player.pitchRatings.contactProfile.groundball / 10 %></div>
                            </div>

                            <div class="skill-bar handedness">
                                <div class="blue center" style="flex-basis:<%= player.pitchRatings.contactProfile.flyBall / 10 %>%;"><strong>FB</strong> <%= player.pitchRatings.contactProfile.flyBall / 10 %></div>
                            </div>

                            <div class="skill-bar handedness">
                                <div class="green center" style="flex-basis:<%= player.pitchRatings.contactProfile.lineDrive  / 10%>%;"><strong>LD</strong> <%= player.pitchRatings.contactProfile.lineDrive / 10 %></div>
                            </div>

                        </div>


                    </div>
                    <div class="right">
                    
                        <% 
                            for (let p of player.pitchRatings.pitches) { 

                        %>
                                <div class="wrapper">
                                    <div class="label"><%= p.type %></div>
                                    <div class="skill-bar">
                                        <div class="red center" style="flex-basis:<%= p.rating %>%;"><%= p.rating %></div>
                                    </div>
                                </div>
                        <% } %>

                    </div>
                </div>


            <% } %>

        </div>

        <div class="stats">

            <div class="note">Career Stats</div>

            <% if (player.primaryPosition != "P") { %>
                <table>
                    <tr>
                        <th>G</th>
                        <th>AB</th>
                        <th>H</th>
                        <th>2B</th>
                        <th>3B</th>
                        <th>HR</th>
                        <th>R</th>
                        <th>RBI</th>
                        <th>SB</th>
                        <th>AVG</th>
                        <th>OBP</th>
                        <th>SLG</th>
                        <th>OPS</th>
                    </tr>
                    <% if (careerHitterStats.pa > 0) { %>
                        <tr>
                            <td><%= careerHitterStats.games %></td>
                            <td><%= careerHitterStats.atBats %></td>
                            <td><%= careerHitterStats.hits %></td>
                            <td><%= careerHitterStats.doubles %></td>
                            <td><%= careerHitterStats.triples %></td>
                            <td><%= careerHitterStats.homeRuns %></td>
                            <td><%= careerHitterStats.runs %></td>
                            <td><%= careerHitterStats.rbi %></td>
                            <td><%= careerHitterStats.sb %></td>
                            <td><%= formatRatio(careerHitterStats.avg) %></td>
                            <td><%= formatRatio(careerHitterStats.obp) %></td>
                            <td><%= formatRatio(careerHitterStats.slg) %></td>
                            <td><%= formatRatio(careerHitterStats.ops) %></td>

                        </tr>
                    <% } else { %>
                        <tr>
                            <td style="text-align:center;" colspan="13">No games played.</td>
                        </tr>
                    <% } %>


                </table>
            <% } else { %>

                <table>
                    <tr>
                        <th>W</th>
                        <th>L</th>
                        <th>GS</th>
                        <th>IP</th>
                        <th>ERA</th>
                        <th>AB</th>
                        <th>PA</th>
                        <th>R</th>
                        <th>ER</th>
                        <th>HR</th>
                        <th>BB</th>
                        <th>SO</th>
                        <th>HBP</th>

                    </tr>
                    <tr>

                    <% if (careerPitcherStats.battersFaced > 0) { %>
                        <tr>
                            <td><%= careerPitcherStats.wins %></td>
                            <td><%= careerPitcherStats.losses %></td>
                            <td><%= careerPitcherStats.starts %></td>
                            <td><%= careerPitcherStats.ip %></td>
                            <td><%= careerPitcherStats.era.toFixed(2) %></td>
                            <td><%= careerPitcherStats.atBats %></td>
                            <td><%= careerPitcherStats.battersFaced %></td>
                            <td><%= careerPitcherStats.runs %></td>
                            <td><%= careerPitcherStats.er %></td>
                            <td><%= careerPitcherStats.homeRuns %></td>
                            <td><%= careerPitcherStats.bb %></td>
                            <td><%= careerPitcherStats.so %></td>
                            <td><%= careerPitcherStats.hbp %></td>


                        </tr>
                    <% } else { %>
                        <tr>
                            <td style="text-align:center;" colspan="14">No games played.</td>
                        </tr>
                    <% } %>



                    </tr>
                </table>
            <% } %>

            <div class="note">Season Stats</div>

            <% if (player.primaryPosition != "P") { %>
                
                <table>
                    <thead>
                        <tr>
                            <th>Age</th>
                            <th>G</th>
                            <th>PA</th>
                            <th>AB</th>
                            <th>R</th>
                            <th>H</th>
                            <th>2B</th>
                            <th>3B</th>
                            <th>HR</th>
                            <th>RBI</th>
                            <th>SB</th>
                            <th>CS</th>
                            <th>BB</th>
                            <th>SO</th>
                            <th>AVG</th>                    
                            <th>OBP</th>                    
                            <th>SLG</th>                    
                            <th>OPS</th> 
                        </tr>
                    </thead>
                    <tbody>


                    <% if (careerSeasonsHitResult?.length > 0) { %>

                        <% for(let hitResult of careerSeasonsHitResult) { 
                            let avg = statService.getAVG(hitResult.hits, hitResult.atBats)
                            let obp = statService.getOBP(hitResult.hits, hitResult.bb, hitResult.hbp, hitResult.pa)
                            let slg = statService.getSLG(hitResult.singles, hitResult.doubles, hitResult.triples, hitResult.homeRuns, hitResult.atBats)
                            let ops = statService.getOPS(obp, slg)
                            
                        %>
                            <tr>
                                <td><%= hitResult.age %></td>
                                <td><%= hitResult.games %></td>
                                <td><%= hitResult.pa %></td>
                                <td><%= hitResult.atBats %></td>
                                <td><%= hitResult.runs %></td>
                                <td><%= hitResult.hits %></td>
                                <td><%= hitResult.doubles %></td>
                                <td><%= hitResult.triples %></td>
                                <td><%= hitResult.homeRuns %></td>
                                <td><%= hitResult.rbi %></td>
                                <td><%= hitResult.sb %></td>
                                <td><%= hitResult.cs %></td>
                                <td><%= hitResult.bb %></td>
                                <td><%= hitResult.so %></td>
                                <td><%= formatRatio(avg) %></td>
                                <td><%= formatRatio(obp) %></td>
                                <td><%= formatRatio(slg) %></td>
                                <td><%= formatRatio(ops) %></td>
                            </tr>
                        <% } %>

                    <% } else { %>
                        <tr>
                            <td style="text-align:center;" colspan="20">No games played.</td>
                        </tr>
                    <% } %>


                        

                    </tbody>                            
                </table>


            <% } else { %>
                <table>
                    <thead>
                        <tr>
                            <th>Age</th>
                            <th>GS</th>
                            <th>W-L</th>
                            <th>IP</th>
                            <th>H</th>
                            <th>R</th>
                            <th>ER</th>
                            <th>HR</th>
                            <th>BB</th>
                            <th>SO</th>
                            <th>HBP</th>
                            <th>BF</th>
                            <th>ERA</th> 
                
                        </tr>
                    </thead>
                    <tbody>

                    <% if (careerSeasonsPitchResult?.length > 0) { %>

                        <% for(let pitchResult of careerSeasonsPitchResult) { %>
                                <tr>
                                    <td><%= pitchResult.age %></td>
                                    <td><%= pitchResult.starts %></td>
                                    <td><%= pitchResult.wins %>-<%= pitchResult.losses %></td>
                                    <td><%= statService.getIP(pitchResult.outs) %></td>
                                    <td><%= pitchResult.hits %></td>
                                    <td><%= pitchResult.runs %></td>
                                    <td><%= pitchResult.er %></td>
                                    <td><%= pitchResult.homeRuns %></td>
                                    <td><%= pitchResult.bb %></td>
                                    <td><%= pitchResult.so %></td>
                                    <td><%= pitchResult.hbp %></td>
                                    <td><%= pitchResult.battersFaced %></td>
                                    <td><%= statService.getERA(pitchResult.er, pitchResult.outs) != undefined ? statService.getERA(pitchResult.er, pitchResult.outs).toFixed(2) : "∞" %></td>
                                </tr>
                        <% } %>

                    <% } else { %>
                        <tr>
                            <td style="text-align:center;" colspan="14">No games played.</td>
                        </tr>
                    <% } %>


                    </tbody>                            
                </table>
                
            <% } %>



        </div>
    </div>

</body>

</html>

`

const GENERATING_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generating Player...</title>
    <style>
        body {
            font-size: 15px;
            font-family: sans-serif;
            padding: 5px;
            box-sizing: border-box;
            overflow: auto;
            background: white;
        }
    </style>
</head>

<body>

    <h1>Player metadata is generating and will be available in the next metadata update.</h1>
    
</body>

</html>

`
export {
  AnimationService
}