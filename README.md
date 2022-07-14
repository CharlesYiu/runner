# [runner](https://deno.land/x/runner)
run deno scripts with deno easily
```typescript
import { Permission, Runner, run } from "https://deno.land/x/runner/runner.ts"
```
# use
to simply run (and optionally wait) for the file to finish executing, use the run method
```typescript
run("script.ts")
await run("script.ts") // this waits for it to finish
```
to run the script and stop it later, create a `Runner` object
```typescript
const runner = new Runner("script.ts")
runner.run()
setTimeout(() => runner.kill("SIGTERM"), 5000) // stop running after 5 seconds
```
# permissions
in this library, permissions are added as extra parameters.  
to have your desired permissions take affect, you can use the `Permission` object.  
you cannot construct the class directly so you have to run or use the static methods and properties of the object.
## examples
### network
full network permissions are given when `Permission.net` is included
```typescript
run("server.ts", Permission.net) // allow the network access ('--allow-net')
```
network permissions can also be only for certain hostnames and ports like this
```typescript
run("server.ts", Permission.net(8000)) // allow the port 8000 ('--allow-net=:8000')
run("server.ts", Permission.net("deno.land")) // allow the hostname 'deno.land' ('--allow-net=deno.land')

// allow the hostname 'deno.land' and the port 8000 ('--allow-net=deno.land,:8000')
run("server.ts", Permission.net("deno.land", 8000))

// allow the port 8000 for the hostnames 'deno.land' 'github.com' ('--allow-net=deno.land:8000,github.com:8000')
run("server.ts", Permission.net(["deno.land", "github.com", 8000]))

// allow the port 8000 and 9000 for the hostnames 'deno.land' 'github.com'
// ('--allow-net=deno.land:8000,github.com:8000,deno.land:9000,github.com:9000')
run("server.ts", Permission.net(["deno.land", "github.com", 8000, 9000]))
```
### files
file permissions can be given accordingly like so
```
run("file.ts", Permission.read) // read file permissions ('--allow-read')
run("file.ts", Permission.write) // write file permissions ('--allow-write')
run("file.ts", Permission.read, Permission.write) // full file permissions ('--allow-read --allow-write')

run("file.ts", Permission.read("text.txt")) // read file permissions for text.txt ('--allow-read')
run("file.ts", Permission.write("text.txt")) // read file permissions for text.txt ('--allow-read')
```
