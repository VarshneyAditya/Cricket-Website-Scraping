// node CrickInfo.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --dest=WorldCup 

let minimist= require("minimist");
let pdf=require("pdf-lib");
let excel=require("excel4node");
let path= require("path");
let fs= require("fs");
let axios=require("axios");
let jsdom=require("jsdom")
let json=require("json");
const { match } = require("assert");

let args=minimist(process.argv);
let downLoadPromise= axios.get(args.source);
downLoadPromise.then(function(response)
{
    let html= response.data;
    let dom= new jsdom.JSDOM(html);
    let document=dom.window.document;
    let matchScoreBlockDivs= document.querySelectorAll("div.match-score-block");
    
    let matches=[];
    for(let i=0; i<matchScoreBlockDivs.length; i++)
    {    
        let matchInfoDivs=matchScoreBlockDivs[i].querySelectorAll("div.match-info");
        let match={

        };
        let nameps =matchScoreBlockDivs[i].querySelectorAll("p.name");
        let scoreSpan=matchScoreBlockDivs[i].querySelectorAll("span.score")
        let resultSpan=matchScoreBlockDivs[i].querySelector("div.status-text>span")
        
        if(scoreSpan.length==2)
        {
            match.scoret1=scoreSpan[0].textContent;
            match.scoret2=scoreSpan[1].textContent;
        }
        else if(scoreSpan.length==1)
        {
            match.scoret1= scoreSpan[0].textContent;
            match.scoret2="";
        }
        else
        {
            match.scoret1="";
            match.scoret2="";
        }

        match.team1=nameps[0].textContent;
        match.team2=nameps[1].textContent;
        match.result=resultSpan.textContent;
        matches.push(match);
    }
    let matchJson=JSON.stringify(matches)
    fs.writeFileSync("JsonOfMatches.json",matchJson,"utf-8" )
        let teams=[];
        for(let i=0; i<matches.length; i++)
        {
            populateTeamInTeamsArray(teams, matches[i]);
        }

        for(let i=0; i<matches.length;i++)
        {
            populatesMatchDetailsInTeam(teams, matches[i]);
        }
        let teamsJson=JSON.stringify(teams);
        fs.writeFileSync("teams.json", teamsJson, "utf-8"); 
        let convertIntoExcel=convertExcel(teams);
        convertIntoPDF(teams);
        
    
}).catch(function(err){
    console.log(err);
})


function convertIntoPDF(teams){
    if(fs.existsSync("worldCup"))
    {
        fs.rmdirSync("worldCup", { recursive: true });

    }
    fs.mkdirSync("worldCup");  
     
    for(let i=0; i<teams.length; i++){
        let team1path=path.join("worldCup", teams[i].name );
        fs.mkdirSync(team1path);

        for(let j=0; j<teams[i].match.length; j++){
            let matchDetailsPath=path.join(team1path, teams[i].match[j].oppoName);
            createScoreCard(matchDetailsPath, teams[i].match[j], teams[i].name )
        }
    }
}


function createScoreCard (matchInfoPath, matchInfo, team1, teams)
{
    let teamOne=team1;
    let result= teamOne+" "+matchInfo.result;
    let OpponentName=matchInfo.oppoName;
    let originalBytes=fs.readFileSync("Template.pdf")
    let file=pdf.PDFDocument.load(originalBytes)
    file.then(function(response){
        let page=response.getPage(0);
        page.drawText(teamOne, 
            {
                x:330,
                y:654,
                size:11
            });
        page.drawText(OpponentName,{
            x:330,
            y:632,
            size:11
        });
        page.drawText(matchInfo.selfScore, {
            x:330,
            y:607,
            size:11
        });
        page.drawText(matchInfo.oppoScore, {
            x:330,
            y:582,
            size:11
        });
        page.drawText(matchInfo.result, {
            x:330,
            y:555,
            size:11
        });
        let promiseToSave=response.save()
        promiseToSave.then(function(changedBytes){
            if(fs.existsSync(matchInfoPath+".pdf")==true)
            {
                fs.writeFileSync(matchInfoPath+"1.pdf", changedBytes);
            }
            else
            {
                fs.writeFileSync(matchInfoPath+".pdf", changedBytes);
            }
        })
    })
}

function convertExcel(teams)
{
        let wb = new excel.Workbook();
        for(let i=0; i<teams.length; i++)
        {
            let sheet= wb.addWorksheet(teams[i].name);
            sheet.cell(1,1).string("Vs");
            sheet.cell(1,2).string("Team Score");
            sheet.cell(1,3).string("Opponent Score");
            sheet.cell(1,4).string("Result");
            for(let j=0; j<teams[i].match.length; j++)
            {
            sheet.cell(j+2, 1).string(teams[i].match[j].oppoName);
            sheet.cell(j+2, 2).string(teams[i].match[j].selfScore);
            sheet.cell(j+2, 3).string(teams[i].match[j].oppoScore);
            sheet.cell(j+2, 4).string(teams[i].match[j].result);
            }
            
        
        }

        wb.write("ExcelFile.csv");
        
}

function populateTeamInTeamsArray(teams, matches)
        {
            let indx1=-1;
            for(let i=0; i<teams.length; i++){
                 if(teams[i].name==matches.team1){
                    indx1=i;
                    break;
                }
            }

            if(indx1==-1){
                let team={
                    name: matches.team1,
                    match:[]
                }
                teams.push(team);
            }
            
            let indx2=-1;   
            for(let i=0; i<teams.length; i++){
                if(teams[i].name==matches.team2){
                   indx2=i;
                   break;
               }
           }

           if(indx2==-1){
               let team={    
                   name: matches.team2,
                   match:[]
               };
               teams.push(team);
           }
        }

function populatesMatchDetailsInTeam(teams, matches)
{   
    let indx1=-1;
    for( let i=0; i<teams.length; i++){
        if(teams[i].name==matches.team1){
            indx1=i;
            break;
        }
    }
    
    let team1=teams[indx1];

    let matchDetails={
        oppoName:matches.team2,
        selfScore :matches.scoret1,
        oppoScore:matches.scoret2,
        result:matches.result
    }
    
    team1.match.push(matchDetails);
    

    let indx2=-1;
    for( let i=0; i<teams.length; i++){
        if(teams[i].name==matches.team2){
            indx2=i;
            break;
        }
    }
   
    let team2=teams[indx2];
    matchDetails={
            oppoName:matches.team1,
            selfScore :matches.scoret2,
            oppoScore:matches.scoret1,
            result:matches.result
    }
    team2.match.push(matchDetails)
}
    
