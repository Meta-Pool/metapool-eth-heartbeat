// -----------
// Module Init
// -----------
//Bare bones minimal node web server
// internal use only to:
// * show stats from the meta-pool-heartbeat
// * respond with "pong" to watchdog's "ping"

//Dependencies
//------------
import * as path from 'path';
import * as  fs from 'fs';
import * as  url from 'url';
import * as http from 'http';

//Module Vars
//-----------
//var
export const contentTypesByExtension = {
    '.html': "text/html; charset=utf-8"
    , '.css': "text/css; charset=utf-8"
    , '.js': "application/javascript; charset=utf-8"
    , '.jpg': "binary/image"
    , '.png': "binary/image"
    , '.gif': "binary/image"
    , '.ico': "binary/image"
};

type AppRequestHandlerFunction = (server: BareWebServer, urlParts: url.UrlWithParsedQuery, req: http.IncomingMessage, resp: http.ServerResponse)=>boolean

export class BareWebServer {

    httpServer: http.Server
    port: number
    wwwRoot: string
    appHandler: AppRequestHandlerFunction

    // ---------------------------
    //    public function start( staticDir:string, aAppHandler:function, port)
    // ---------------------------
    //Start the web server
    constructor(staticDir: string, aAppHandler:AppRequestHandlerFunction, port: number) {

        this.wwwRoot = path.resolve(process.cwd(), staticDir);

        //default port = 80
        this.port = port || 80;

        //dynamic content handler (application)
        this.appHandler = aAppHandler;

        //static files content handler
        this.httpServer = http.createServer(this.minimalHandler.bind(this));
        this.httpServer.requestTimeout=10*1000

    }

    start() {
        console.log(new Date())
        this.httpServer.listen(this.port);
        console.log("nodejs version:",process.version);
        console.log("wwwRoot: " + this.wwwRoot);
        console.log("Bare Web Server listening on http://localhost:" + this.port);
    }

    close() {
        console.log("close",new Date())
        this.httpServer.close();
    }

    //------------------------------
    // helper function MinimalHandler (request, response)
    //---------------------------
    //This is a minimal handler for http.createServer
    minimalHandler(req: http.IncomingMessage, resp: http.ServerResponse) {
        try {

            //console.log('' + req.method + " " + req.url);

            //parse request url. [url.parse] (http://nodejs.org/docs/latest/api/url.html)
            const urlParts = url.parse(req.url||"", true);

            //We first give the app a chance to process the request (dynamic).
            if (this.appHandler && this.appHandler(this, urlParts, req, resp)) {
                //handled by app
                return;
            }

            else {
                this.writeFileContents(urlParts.pathname||"", resp);
                resp.end();
            }

        }
        catch (e) {
            respond_error(503, JSON.stringify(e), resp);
        }
    }


    //## Bare Server Static resources Helper Functions

    //  helper function findPath(pathname) // return full path / undefined if not found
    // ---------------------------
    findPathAndFilename(url:string):string {
        // console.log("Www root", this.wwwRoot)
        let result:string;
        // console.log("findPath %s",pathname);
        if (url === path.sep) {
            result = this.wwwRoot;
        }
        else {
            //result = path.join(wwwRoot, pathname)
            result = path.join(this.wwwRoot, url);
        }

        // check if file exists
        // if it is dir, -> add '/index.html'
        let fileExists = fs.existsSync(result);
        if (fileExists && fs.statSync(result).isDirectory()) {
            result = path.join(result, 'index.html');
            fileExists = fs.existsSync(result);
        }
        return fileExists? result : "";
    }

    // ---------------------------
    //method writeFileContents(filename)
    // ---------------------------
    writeFileContents(filename:string, resp:http.ServerResponse, replaceData?:Record<string,any>) {
        console.log(1, this.wwwRoot)
        const fullPath = this.findPathAndFilename(filename)
        if (!fullPath) {
            respond_error(404, `FNF:${filename}`, resp)
            return
        }
        // add headers
        //writeHeadersFor(path.extname(fullPath), resp);

        const content = fs.readFileSync(fullPath);

        if (replaceData){
            let text = content.toString();
            for(const key in replaceData){
                const toReplace = "{{"+key+"}}"
                while(text.indexOf(toReplace)>=0) text = text.replace(toReplace,replaceData[key]);
            }
            //send replaced template
            resp.write(text);
        }
        else {
            //send read file
            resp.write(content);
        }
    }


}


// ---------------------------
// method error(statusCode,message)
// ---------------------------
export function respond_error (statusCode:number, message:string, resp:http.ServerResponse) {
    resp.writeHead(statusCode, { 'Content-Type': 'text/plain' });
    resp.write('ERROR: ' + message);
    resp.end();
}
