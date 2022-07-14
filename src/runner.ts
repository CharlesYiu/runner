type _Permission = Permission | ((..._: string[]) => Permission) | ((..._: ((number | string)[] | number | string)[]) => Permission)
type Permissions = (_Permission | _Permission[])[]
export class Permission {
    private constructor(perm: string, params: string[] = []) {
        this._perm = perm
        this._params = params
    }
    private _perm: string
    public get perm(): string { return this._perm }
    private _params: string[]
    public get params(): string[] { return this._params }
    public toString() { return `--allow-${this.perm}${(this.params.length === 0 ? "" : `=${this.params.join(",")}`)}` }
    public static env(...env: string[]): Permission { return new Permission("env", env) }
    public static get hrtime(): Permission { return new Permission("hrtime")}
    public static net(...hosts: ((number | string)[] | number | string)[]): Permission {
        const params: string[] = []
        hosts.forEach(host => {
            if (!Array.isArray(host)) host = [host]
            const hostnames: string[] = host.filter((value, _) => {
                if (typeof value !== "string") return false
                if (value.length > 255) return false
                if (value[-1] === ".") value = value.slice(0, value.length - 1)
                return value.split(".").every((value, _) => /(?!-)[A-Z\d-]{1,63}(?<!-)$/.test(value.toUpperCase()))
            }) as string[]
            const ports: number[] = host.filter((value, _) => {
                if (typeof value !== "number") return false
                return !(0 <= value && value <= 65535 && Number.isNaN(value))
            }) as number[];
            (hostnames.length === 0 ? [""] : hostnames).forEach(hostname => {
                if (ports.length > 0) ports.forEach(port => params.push(`${hostname}:${port}`))
                else params.push(hostname)
            })
        })
        return new Permission("net", params)
    }
    public static get ffi(): Permission { return new Permission("ffi") }
    public static read(...files: string[]): Permission {
        for (const index in files) files[index] = Deno.realPathSync(files[index])
        return new Permission("read", files)
    }
    public static run(...processes: string[]): Permission { return new Permission("process", processes) }
    public static write(...files: string[]): Permission {
        for (const index in files) files[index] = Deno.realPathSync(files[index])
        return new Permission("write", files)
    }
    public static get all(): Permission { return new Permission("all") }
    public static cleanPermissions(permissions: Permissions): Permission[] {
        const _permissions: Permission[] = []
        permissions.forEach(permission => {
            if (typeof permission === "function") permission = permission()
            _permissions.push(permission as Permission)
        })
        const removeIndexes: number[] = []
        _permissions.forEach((value, index) => {
            if (removeIndexes.includes(index)) return
            if (value.params.length === 0) return new Permission(value.perm, [])
            let ignoreParams = false
            const params = value.params
            _permissions.forEach((_value, _index) => {
                if (value.perm !== _value.perm || index === _index) return
                if (_value.params.length === 0) ignoreParams = true
                if (!ignoreParams) params.push(..._value.params)
                removeIndexes.push(_index)
            })
            _permissions[index] = new Permission(value.perm, ignoreParams ? [] : params)
        })
        return _permissions.filter((_, index) => !removeIndexes.includes(index))
    }
}
export class Runner {
    private _permissions: Permission[] = []
    public get permissions(): Permission[] { return this._permissions }
    private _file: string
    public get file(): string { return this._file }
    private params: string[] = []
    private process?: Deno.Process
    constructor(file: string, ...permissions: Permissions) {
        this._file = file
        this._permissions = Permission.cleanPermissions(permissions)
        this.permissions.forEach(permission => this.params.push(permission.toString()))
    }
    run(): Promise<number> {
        if (typeof this.process !== "undefined") throw Error("the process cannot be ran again")
        this.process = Deno.run({ "cmd": [ "deno", "run", ...this.params, Deno.realPathSync(this.file) ] })
        return new Promise((resolve, reject) => {
            this.process!.status()
                .then(status => (status.success ? resolve : reject)(status.code))
        })
    }
    kill(signal: Deno.Signal): void {
        if (typeof this.process === "undefined") throw Error("the process cannot be killed when yet to be ran")
        this.process.kill(signal)
        this.process.close()
        this.process = undefined
    }
}
export async function run(file: string, ...permissions: Permissions): Promise<number> {
    return await (new Runner(file, ...permissions)).run()
}
