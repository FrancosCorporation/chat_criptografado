package Exemplos;


import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.security.Key;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Scanner;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;



class PeerChat1 extends Thread{
	static int porta=8888;
	static String ipVizinho = "localhost";
	static int portaVizinho = 7777;
	static DatagramSocket socket;
	Key chave;

	public PeerChat1() {
		try {
			socket = new DatagramSocket(porta);
		} catch (Exception e) {
		}}
	@Override
	public void run() {
		try { 
			while (true) {
				// descriptografia 
				//importando a chave
				ObjectInputStream in = new ObjectInputStream(new FileInputStream("Chave.key"));
				//lendo a chave
				chave = (Key) in.readObject();
				//fechando a chave
				in.close();
				//cifrando com a chave
				Cipher decipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
				decipher.init(Cipher.DECRYPT_MODE, chave);
				// recebendo pacote
				byte[] dados = new byte[1024];
				//setando o pacote
				DatagramPacket pacoteRecebido = new DatagramPacket(dados,dados.length);
				socket.receive(pacoteRecebido);	
				//porta e ip de origem
				String origem = pacoteRecebido.getAddress().toString();
				int portaOrigem = pacoteRecebido.getPort();
				byte[] dadosRecebidos = Arrays.copyOfRange(pacoteRecebido.getData(), 0, pacoteRecebido.getLength());
				//descriptografando
				byte[] dadosDecifrados = decipher.doFinal(dadosRecebidos);
				String mensagemRecebida = new String(dadosDecifrados);
				//exibindo mensagem
				System.out.println("");
				System.out.print(mensagemRecebida);

			}

		} catch (Exception e) {
			e.printStackTrace();
		}

	}
	public static void gerarChave() throws Exception {
		System.out.println(" *** Opcao 1 (Gerar chave e enviar.) ***** ");
		System.out.println(" *** Opcao 2 (Esperar para Receber.) ***** ");
		System.out.println(" ***** Digitar a Opcao: ******** ");
		int op = new Scanner(System.in).nextInt();

		if(op == 1) {            
			Key chave; //Objeto que conterá a chave DES gerada

			//Criar um gerador de chaves para criar uma nova chave DES(Tipo de chave DES)
			KeyGenerator gerador = KeyGenerator.getInstance("DES");

			//Iniciar o gerador com uma sequência de dados aleatorios
			gerador.init(new SecureRandom());

			//Gerar a chave DES 
			chave = gerador.generateKey();

			//System.out.println("Chave gerada: " + chave.getEncoded().toString());

			//Gravar a chave gerada em um arquivo chamado chave.key
			ObjectOutputStream arquivoChave = new ObjectOutputStream(new FileOutputStream("Chave.key"));
			arquivoChave.writeObject(chave);
			System.out.println("Chave gerada com suscesso !! ");
			System.out.println(chave+"\n\n");}

		else {
			System.out.println("Errou a opcao amiguinho.. ");
		}            
	}

	public void enviarmensagem() {
		System.out.println("Insira seu nome: ");
		String nome = new Scanner(System.in).nextLine();
		nome += " : ";
		try {
			while(true) {
				//abrindo a chave salva
				ObjectInputStream in = new ObjectInputStream(new FileInputStream("Chave.key"));
				//lendo a chave
				chave = (Key) in.readObject();
				//criptografando
				Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
				cipher.init(Cipher.ENCRYPT_MODE, chave);

				System.out.print(nome);
				String mensagem = new Scanner(System.in).nextLine();
				mensagem = nome+mensagem;

				byte[] bytesMensagem = new byte[1024];
				bytesMensagem  = mensagem.getBytes();

				byte[] dadosCifrados = cipher.doFinal(bytesMensagem);
				//enviando pacote
				DatagramPacket pacoteEnviado = new DatagramPacket(dadosCifrados, dadosCifrados.length, 
						InetAddress.getByName(ipVizinho), portaVizinho );
				socket.send(pacoteEnviado);} 

		}catch (Exception e) {
			e.printStackTrace();
		}}

	public static class Chat1 {
		public static void main(String[] args) throws Exception{
			System.out.println(" **** Opcao 1 (Gerar chave) ***** ");
			System.out.println(" *** Opcao 2 (Entrar no programa) ***** ");
			System.out.println(" ***** Digitar a Opcao: ******* ");
			int op = new Scanner(System.in).nextInt();
			if (op==1) {
				gerarChave();}
			else {
				//iniciando o metodo chat1
				PeerChat1 chat= new PeerChat1();
				//chamando o chat na thread
				Thread t= new Thread(chat);
				//startando a thread
				t.start();
				//iniciando o chat junto com o enviar mensagens
				chat.enviarmensagem();}
		}
	}
}