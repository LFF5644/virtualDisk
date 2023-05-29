#!/usr/bin/env node
const crypto=require("crypto");
const fs=require("fs");

function getInput(text=""){
	process.stdout.write(text);
	return new Promise(resolve=>{
		process.stdout.once("data",data=>{
			resolve(data.toString("utf-8").trim());
		});
	});
}
function createHash(content,outputType){
	return crypto.createHash("sha256").update(String(content)).digest(outputType);
}
function encrypt(data){
	const {
		content,
		contentType,
		outputType,
		password,
	}=data;

	const cipher=crypto.createCipheriv("aes-256-gcm",createHash(password),IV);
	const part_a=cipher.update(content,contentType);
	const part_b=cipher.final();
	const buffer=Buffer.concat([
		cipher.getAuthTag(), // default auth length is 16 bytes
		part_a,
		part_b,
	]);
	return !outputType?buffer:buffer.toString(outputType);
}
function decrypt(data){
	const {
		content,
		contentType,
		outputType,
		password,
	}=data;

	const bytes=Buffer.from(content,contentType);
	const decipher=crypto.createDecipheriv("aes-256-gcm",createHash(password),IV);
	decipher.setAuthTag(bytes.subarray(0,16)); // default auth length is 16 bytes
	const buffer=Buffer.concat([
		decipher.update(bytes.subarray(16)), // default auth length is 16 bytes
		decipher.final(),
	]);
	return !outputType?buffer:buffer.toString(outputType);
}

async function readVirtualDisk(){
	try{
		virtualDisk.raw=fs.readFileSync(virtualDisk_file);
		if(!virtualDisk.password) virtualDisk.password=await getInput("Enter Password: ");
		const passwordHash_correct=virtualDisk.raw.subarray(0,32).toString("utf-8");
		const passwordHash=createHash(virtualDisk.password).toString("utf-8");
		if(passwordHash!==passwordHash_correct){
			console.log("NOT CORRECT PASSWORD!");
			process.exit(1);
		}

		virtualDisk.content=decrypt({
			content: virtualDisk.raw.subarray(32),
			password: virtualDisk.password,
		});

	}
	catch(e){
		console.log("Virtual Disk cant not load/read, create a new one!");
		virtualDisk.password=await getInput("Enter Password: ");
		console.log(`Password length is ${virtualDisk.password.length}`);
		virtualDisk.content=Buffer.from("no content","utf-8");

	}
}
async function writeVirtualDisk(){
	if(!virtualDisk.password) virtualDisk.password=await getInput("Enter Password: ");
	const encryptedContent=encrypt({
		content: virtualDisk.content,
		password: virtualDisk.password,
	});
	const data=Buffer.concat([
		createHash(virtualDisk.password),
		encryptedContent,
	]);
	fs.writeFileSync(virtualDisk_file,data);
	virtualDisk.raw=data;
}

const IV=createHash("Crypto file reader/writer version 1.0 made by LFF5644");
const virtualDisk_file="virtualDisk.bin";
const virtualDisk={
	content: null,
	password: null,
	raw: null,
};

(async ()=>{ // MAIN();
	await readVirtualDisk();
	console.log("Current Content: "+virtualDisk.content.toString("utf-8"));
	virtualDisk.content=Buffer.from(await getInput("Enter new Content: "),"utf-8");
	await writeVirtualDisk();

	process.exit(0);
})();
