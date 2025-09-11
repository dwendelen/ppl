fun registerTerraform(environment: String) {
    tasks.register("terraform-$environment", Exec::class) {
        group = "deploy"
        workingDir(projectDir.resolve("src/tf/$environment"))
        commandLine("terraform", "apply", "-refresh=false")
        standardInput = System.`in`
//        dependsOn(project(":airspaces").tasks.named("assembleWeb"))
    }
}

registerTerraform("dev")
//registerTerraform("tst", "jsBrowserDevelopmentWebpack")
registerTerraform("prd")
