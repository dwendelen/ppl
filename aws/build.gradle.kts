fun registerTerraform(environment: String, autoApprove: Boolean = false) {
    tasks.register("terraform-$environment", Exec::class) {
        group = "deploy"
        workingDir(projectDir.resolve("src/tf/$environment"))
        if(autoApprove) {
            commandLine("terraform", "apply", "-refresh=false", "--auto-approve")
        } else {
            commandLine("terraform", "apply", "-refresh=false")
        }

        standardInput = System.`in`
//        dependsOn(project(":airspaces").tasks.named("assembleWeb"))
    }
}

registerTerraform("dev", true)
//registerTerraform("tst", "jsBrowserDevelopmentWebpack")
registerTerraform("prd")
