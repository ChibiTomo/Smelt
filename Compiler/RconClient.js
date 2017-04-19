var chalk = require('chalk');
var util = require('util');
var Settings = require("../Configuration/Settings");

var Rcon = require('rcon');


var RconClient = (function () 
{
	function RconClient(commandModule) 
	{
		if(this.validateSettings())
		{
			this.client = new Rcon(Settings.Current.RCON.IpAddress, 
									Settings.Current.RCON.PortNumber, 
									Settings.Current.RCON.Password);

			this.client.on("auth", () => { this.onAuthentication(); });
			this.client.on("response", r => { this.onResponse(r); });
			this.client.on('error', function(err)
			{
				console.log("Got error: " + err);
			});

			this.commandModule = commandModule;
			this.commandIndex = 0;

			// raise y by 1 because minecarts usually execute 1 block up (no Minecarts here)

			this.selector = this.commandModule.RconSelector;
			if(this.selector == "") this.selector = "rcon_" + this.commandModule.SourceName;


			this.executeAsCommand = '/execute ' + this.selector + ' ~ ~1 ~ '; 
		}
	}

	RconClient.prototype.onAuthentication = function()
	{
		console.log(chalk.green("   Connected...\n"));
		this.startProcess();
	}

	RconClient.prototype.onResponse = function(response)
	{
		if(this.runStartProcess) this.testForEntity();
		else if(this.runTestForEntity) this.handleTestForEntityResponse(response);
		else if(this.runSendCommand) this.sendCommandHandler(response);
	}

	RconClient.prototype.startProcess = function()
	{
		this.runStartProcess = true;
		this.client.send('/tellraw @a [{"text":"[Smelt] Installing with RCON...","color":"green"}]');
	}

	RconClient.prototype.testForEntity = function()
	{
		this.runStartProcess = false;
		this.runTestForEntity = true;
		this.client.send("/testfor " + this.selector);
	}

	RconClient.prototype.handleTestForEntityResponse = function(response)
	{
		this.runTestForEntity = false;
		var finds = response.match(/Found/g);

		if(finds && finds.length == 1)
		{
			console.log(chalk.green("   Selector found...\n"));
			this.startSendingCommands();
		}
		else if(finds && finds.length > 1)
		{
			var message = util.format("The selector (%s) matches MULTIPLE entities", this.selector);
			this.client.send('/tellraw @a [{"text":"[Smelt] ERROR: ' + message + '.","color":"red"}]');
			console.log(chalk.red.bold("   RCON ERROR!\n"));
			console.log(chalk.red.bold("   " + message + ".\n"));
			this.client.disconnect();
		}
		else
		{
			var message = util.format("The selector (%s) entity does not exist", this.selector);
			this.client.send('/tellraw @a [{"text":"[Smelt] ERROR: ' + message + '.","color":"red"}]');
			console.log(chalk.red.bold("   RCON ERROR!\n"));
			console.log(chalk.red.bold("   " + message + ".\n"));
			this.client.disconnect();
		}
	}

	RconClient.prototype.validateSettings = function()
	{
		var okay = false;
		if(Settings.Current.Output.UseRCON
		&& Settings.Current.RCON.IpAddress != ""
		&& Settings.Current.RCON.PortNumber != 0
		&& Settings.Current.RCON.Password != "")
		{
			okay = true;
		}
		else
		{
			console.log(chalk.red.bold("\n   RCON ERROR!\n"));
			console.log(chalk.red.bold("   Configuration settings are incorrect for RCON.\n"));
		}
		return okay;
	}

	RconClient.prototype.startSendingCommands = function()
	{
		console.log(chalk.green("   Executing commands...\n"));
		this.sendCommand();
	}

	RconClient.prototype.sendCommand = function()
	{
		this.runSendCommand = true;
		var command = this.executeAsCommand + this.commandModule.Commands[this.commandIndex];
		
		if(Settings.Current.Output.ShowDebugInfo)
		{ 
			console.log(chalk.bold("\n * SENDING"));
			console.log("   -> " + command);
		}
		
		this.client.send(command);
	}

	RconClient.prototype.sendCommandHandler = function(response)
	{
		this.runSendCommand = false;
		this.commandIndex++;

		if(Settings.Current.Output.ShowDebugInfo)
		{
			console.log(chalk.bold("\n * RESPONSE"));
			console.log("   -> " + response);
		}

		if(this.commandIndex < this.commandModule.Commands.length)
		{
			this.sendCommand();
		}
		else
		{
			this.client.send('/tellraw @a [{"text":"[Smelt] Done.","color":"green"}]');
			this.client.disconnect();
			console.log(chalk.green("   Done.\n"));
		}
	}

	RconClient.prototype.sendModule = function()
	{
		if(this.client != null)
		{
			console.log(chalk.green("\n\ * INSTALLING WITH RCON...\n"));

			if(Settings.Current.Output.ShowDebugInfo)
			{
				console.log(chalk.bold("\n * RCON Settings:"));
				console.log("   -> Settings.Current.RCON.IpAddress = " + Settings.Current.RCON.IpAddress);
				console.log("   -> Settings.Current.RCON.PortNumber = " + Settings.Current.RCON.PortNumber);
				console.log("   -> Settings.Current.RCON.Password = " + Settings.Current.RCON.Password);
				console.log("   -> Selector = " + this.selector);
			}
			
			this.client.connect();
		}
	}

	return RconClient;
})();

module.exports = RconClient;