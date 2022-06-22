package Exemplos;

import java.awt.Desktop;
import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.security.InvalidKeyException;
import java.security.Key;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Scanner;
import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.KeyGenerator;
import javax.crypto.NoSuchPaddingException;
import javax.swing.JOptionPane;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;

class chat1 extends Thread {
	
	static String nome;
	static int porta = 7777;
	static int portaarq = 15000;
	static String ipVizinho;
	static int portaVizinho=8888;
	static int portaarqVizinho=15000;
	static DatagramSocket socket;
	static Key chave;
	static String escolha1;
	static String arquivo;
	static DatagramSocket dsoc;
	static DatagramSocket dsoc2;
	static FileOutputStream f;
	static String arquivo1;
	static Socket conexao;
	static ServerSocket servidor;
	static DataOutputStream dos;
	static ServerSocket server;
	static ObjectInputStream in;
	static String escolha2;
	static Object ipNovo;
	static String latitude;
	static String longitude;

	public chat1() {
		try {
			socket = new DatagramSocket(porta);
		} catch (Exception e) {
		}
	}
	@Override
	public void run() {
		try {
			while (true) {

				ObjectInputStream arquivoChave = new ObjectInputStream(new FileInputStream("Chave.key"));
				chave = (Key) arquivoChave.readObject();
				arquivoChave.close();

				Cipher decipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
				decipher.init(Cipher.DECRYPT_MODE, chave);

				byte[] dados = new byte[1024];
				DatagramPacket pacoteRecebido = new DatagramPacket(dados, dados.length);
				socket.receive(pacoteRecebido);

				String origem = pacoteRecebido.getAddress().toString();
				int portaOrigem = pacoteRecebido.getPort();

				byte[] dadosRecebidos = Arrays.copyOfRange(pacoteRecebido.getData(), 0, pacoteRecebido.getLength());
				byte[] dadosDecifrados = decipher.doFinal(dadosRecebidos);

				String mensagemRecebida = new String(dadosDecifrados);
				System.out.println(
						mensagemRecebida + "\t\t→  " + dados + "  ←");

			}
		} catch (Exception e) {
			e.printStackTrace();
		}

	}

	public static void gerarChave() throws Exception {
		Key chave;

		KeyGenerator gerador = KeyGenerator.getInstance("DES");
		gerador.init(new SecureRandom());

		chave = gerador.generateKey();
		ObjectOutputStream arquivoChave = new ObjectOutputStream(new FileOutputStream("Chave.key"));
		arquivoChave.writeObject(chave);
		arquivoChave.close();
		System.out.println("Chave Gerada: " + chave.getEncoded().toString());

	}

	public void enviarmensagem() {
		System.out.println("\nA qualquer momento digite '/menu' para acessar o Menu de opções:\n\nDigite uma mensagem: ");
		
		try {
			while (true) {

				ObjectInputStream arquivoChave = new ObjectInputStream(new FileInputStream("Chave.key"));
				chave = (Key) arquivoChave.readObject();
				Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
				cipher.init(Cipher.ENCRYPT_MODE, chave);

				Scanner leitura = new Scanner(System.in);
				String mensagem = leitura.nextLine();

				if (mensagem.equalsIgnoreCase("/menu")) {
					abreMenu();
				}

				mensagem = nome + " : " + mensagem;

				byte[] bytesMensagem = new byte[1024];
				bytesMensagem = mensagem.getBytes();

				byte[] dadosCifrados = cipher.doFinal(bytesMensagem);

				DatagramPacket pacoteEnviado = new DatagramPacket(dadosCifrados, dadosCifrados.length,
						InetAddress.getByName(ipVizinho), portaVizinho);
				socket.send(pacoteEnviado);

				System.out.println(mensagem + "\t\t→  " + dadosCifrados + "  ←");

			}

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void abreMenu() throws 	UnknownHostException, 
									IOException, 
									InvalidKeyException, 
									NoSuchAlgorithmException,
									NoSuchPaddingException, 
									ClassNotFoundException, 
									IllegalBlockSizeException, 
									BadPaddingException,
									URISyntaxException {

		escolha1 = String.valueOf(JOptionPane.showInputDialog(null,
						  "\n\n\nDigite 'G' para ver a Geo Localizacao deste Servidor"
						+ "\nDigite 'O' para ver a Geo Localizacao de um outro IP e abrir o Google Maps no Browser           "
						+ "\nDigite 'U' para (servidor)enviar um arquivo criptografado"
						+ "\nDigite 'D' para (cliente) baixar um arquivo enviado "
						+ "\nDigite 'S' para sair do Chat"
						+ "\nDigite 'V' para voltar ao Chat\n\n"));
		
		
		while (!escolha1.equalsIgnoreCase("X")) {

			if (escolha1.equalsIgnoreCase("G")) {
				geoLocalizacao();
			}
			if (escolha1.equalsIgnoreCase("O")) {
				geoLocalizacao2();
			}
			if (escolha1.equalsIgnoreCase("U")) {
				//servidor
				enviaArquivo();
			}
			if (escolha1.equalsIgnoreCase("D")) {
				//cliente
				recebeArquivo();
			}
			if (escolha1.equalsIgnoreCase("S")) {
				JOptionPane.showMessageDialog(null, "\n\nSessão encerrada");
				socket.close();
				System.exit(0);
			}
			if (escolha1.equalsIgnoreCase("V")) {
				enviarmensagem();
			} else {
				escolha1 = String.valueOf(JOptionPane.showInputDialog(null,
								
								  "\nESCOLHA INCORRETA!\n\n"
								+ "\n\nDigite 'U' para enviar um arquivo criptografado "
								+ "\nDigite 'S' para sair do Chat" + "\nDigite 'V' para voltar ao chat"));
			}
		}
		abreMenu();

	}

	private void geoLocalizacao()	throws 	InvalidKeyException, 
											UnknownHostException, 
											NoSuchAlgorithmException, 
											NoSuchPaddingException,
											ClassNotFoundException, 
											IllegalBlockSizeException, 
											BadPaddingException, 
											IOException, 
											URISyntaxException {

		
		URL ipapi = new URL("https://ipapi.co/" + ipVizinho + "/json/");

		URLConnection c = ipapi.openConnection();
		c.setRequestProperty("user-agent", "java-ipapi-client");
		BufferedReader reader = new BufferedReader(new InputStreamReader(c.getInputStream()));
		/*
		*/
		String span = reader.readLine();
		String ip = reader.readLine();
		String city = reader.readLine();
		String region = reader.readLine();
		String region_code = reader.readLine();
		String country = reader.readLine();
		String country_name = reader.readLine();
		String continent_code = reader.readLine();
		String span2 = reader.readLine();
		String postal = reader.readLine();
		latitude = reader.readLine();
		longitude = reader.readLine();
		String timezone = reader.readLine();
		String utf_offset = reader.readLine();
		String country_calling_code = reader.readLine();
		String currency = reader.readLine();
		String languages = reader.readLine();
		String asn = reader.readLine();
		String org = reader.readLine();

		reader.close();

		 for (int cont = 7; cont <=27; cont++) {
	        	if (ip.length() == cont) {
	        		System.out.println(ip.substring(11,(cont-2)));
	        		  JOptionPane.showMessageDialog(null,"\n\n"
	      					+ "                           IP → " + ip.substring(11,(cont-2)) 
								+ "\n                   Cidade → " + city.substring(13,20) 
								+ "\n                   Estado → " + region.substring(15,20) 
							    + "\n       Codigo Estado → " + region_code.substring(20,22) 
							    + "\n           Codigo Pais → " + country.substring(16,18) 
							    + "\n                        Pais → " + country_name.substring(21,27)
							    + "\n                 C.Postal → " + postal.substring(15,20)
							    + "\n                 Latitude → " + latitude.substring(16,24)
							    + "\n              Longitude → " + longitude.substring(17,24)
							    + "\n                       Fuso → " + timezone.substring(17,34)
							    + "\n Prefixo Telefonico → " + country_calling_code.substring(29,32)
							    + "\n                    Moeda → " + currency.substring(17,20)
							    + "\n                   ASNum → " +  asn.substring(13,19)
							    + "\n                       Org   → " + org.substring(12,30)
							    + "                           \n\n");
	        		  escolha2();
		    
	        	}	
		 }

	}

	private void escolha2() throws 	IOException, 
									URISyntaxException, 
									InvalidKeyException, 
									NoSuchAlgorithmException,
									NoSuchPaddingException, 
									ClassNotFoundException, 
									IllegalBlockSizeException, 
									BadPaddingException {
		
		
		escolha2 = String.valueOf(JOptionPane.showInputDialog(null,
									
									  "\nSe deseja buscar outra Geo Localizacao pelo IP digite 'B' "
									+ "\nSe deseja voltar ao menu digite 'M'\n\n\n"));
		int cont = 1;
		while (cont == 1) {
			if (escolha2.equalsIgnoreCase("A")) {
				if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
					Desktop.getDesktop().browse(new URI("https://www.google.com/maps/search/?api=1&query="
							+ latitude.substring(16, 24) + longitude.substring(17, 24)));
					escolha2();
				}

			}
			if (escolha2.equalsIgnoreCase("M")) {
				abreMenu();
			}
			if (escolha2.equalsIgnoreCase("B")) {
				geoLocalizacao2();
			}

		}

	}

	private void geoLocalizacao2()	throws 	IOException, 
											InvalidKeyException, 
											NoSuchAlgorithmException, 
											NoSuchPaddingException,
											ClassNotFoundException, 
											IllegalBlockSizeException, 
											BadPaddingException, 
											URISyntaxException {
		
		
		ipNovo = String.valueOf(JOptionPane.showInputDialog(null, "\n\nDigite um numero de IP: "));

		URL ipapi = new URL("https://ipapi.co/" + ipNovo + "/json/");

		URLConnection c = ipapi.openConnection();
		c.setRequestProperty("user-agent", "java-ipapi-client");
		BufferedReader reader = new BufferedReader(new InputStreamReader(c.getInputStream()));
		/*
		*/
		String span = reader.readLine();
		String ip = reader.readLine();
		String city = reader.readLine();
		String region = reader.readLine();
		String region_code = reader.readLine();
		String country = reader.readLine();
		String country_name = reader.readLine();
		String continent_code = reader.readLine();
		String span2 = reader.readLine();
		String postal = reader.readLine();
		String latitude = reader.readLine();
		String longitude = reader.readLine();
		String timezone = reader.readLine();
		String utf_offset = reader.readLine();
		String country_calling_code = reader.readLine();
		String currency = reader.readLine();
		String languages = reader.readLine();
		String asn = reader.readLine();
		String org = reader.readLine();

		reader.close();
		
		if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
			Desktop.getDesktop().browse(new URI("https://www.google.com/maps/search/?api=1&query="
					+ latitude.substring(16, 24) + longitude.substring(17, 24)));
			
			
		}
		 for (int cont = 7; cont <=27; cont++) {
	        	if (ip.length() == cont) {
	        		System.out.println(ip.substring(11,(cont-2)));
	        		  JOptionPane.showMessageDialog(null,"\n\n"
	      					+ "                           IP → " + ip.substring(11,(cont-2)) 
								+ "\n                   Cidade → " + city.substring(13,20) 
								+ "\n                   Estado → " + region.substring(15,20) 
							    + "\n       Codigo Estado → " + region_code.substring(20,22) 
							    + "\n           Codigo Pais → " + country.substring(16,18) 
							    + "\n                        Pais → " + country_name.substring(21,27)
							    + "\n                 C.Postal → " + postal.substring(15,20)
							    + "\n                 Latitude → " + latitude.substring(16,24)
							    + "\n              Longitude → " + longitude.substring(17,24)
							    + "\n                       Fuso → " + timezone.substring(17,34)
							    + "\n Prefixo Telefonico → " + country_calling_code.substring(29,32)
							    + "\n                    Moeda → " + currency.substring(17,20)
							    + "\n                   ASNum → " +  asn.substring(13,19)
							    + "\n                       Org   → " + org.substring(12,30)
							    + "                           \n\n");
	        		  escolha2();
		    
	        	}	
		 }

	}

	public void enviaArquivo(){
		try {
		/*arquivo = String.valueOf(JOptionPane.showInputDialog(null,
				"\nDigite o nome do arquivo a ser enviado:"));*/
		ServerSocket servidor= new ServerSocket(porta);
		System.out.println("Servidor iniciando.. ");
		Socket conexao = servidor.accept();
		System.out.println("conexao estabelecida.. ");
		    	//servidor
				DataInputStream entrada = new DataInputStream(conexao.getInputStream()); 
		    	System.out.println("recebendo dados..  ");
				FileOutputStream fos = new FileOutputStream("arq-recebido.txt");
				System.out.println("arquivo criado..  ");
				entrada.transferTo(fos);
				servidor.close();
				System.out.println("gravando arquivo..");
				fos.flush();
				fos.close();
				
				//entrada.close();
				//System.out.println("fechando servico...");
				System.out.println("dados recebidos.. ");
				//servidor.close();
				//conexao.close();
			    abreMenu();}
		catch (Exception e) {
			System.out.println(e);
		}
		    }

		/*int tamanhoArquivo = dis.available();
		byte[] bytesArquivo = new byte[tamanhoArquivo];
		dis.readFully(bytesArquivo);
		dis.close();

		Key key;
		in = new ObjectInputStream(new FileInputStream("Chave.key"));
		key = (Key) in.readObject();

		Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
		cipher.init(Cipher.ENCRYPT_MODE, key);
		byte[] bytesArquivoCriptografado = cipher.doFinal(bytesArquivo);

		saida.writeInt(bytesArquivoCriptografado.length);
		saida.write(bytesArquivoCriptografado);
		saida.close();

		enviarmensagem();*/
	

	public void recebeArquivo() {
		try {
		Socket conexao = new Socket(ipVizinho, portaVizinho);
		System.out.println("Conectando com o servidor.. ");
			//cliente
			DataOutputStream saida= new DataOutputStream(conexao.getOutputStream());
	        System.out.println("Cliente Conectado com Sucesso.. ");
	        
			FileInputStream fis = new FileInputStream("arq-enviado.txt");
			System.out.println("Importando o arquivo!! ");
			fis.transferTo(saida);
			saida.flush();
			fis.close();
			//System.out.println("Fechando o arquivo.. ");
			//saida.close();
			//conexao.close();
			//System.out.println("fechando conexao.. ");
			abreMenu();}
		catch (Exception e) {
			System.out.println(e);
		}
	}

		/*Cipher decipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
		decipher.init(Cipher.DECRYPT_MODE, chave);

		int tamanho = entrada.readInt();
		if (tamanho > 0) {
			byte[] dadosCifrados = new byte[tamanho];
			entrada.readFully(dadosCifrados, 0, dadosCifrados.length);
			byte[] dadosDecifrados = decipher.doFinal(dadosCifrados);
			dos = new DataOutputStream(new FileOutputStream("arq-recebido.txt"));
			dos.writeInt(dadosDecifrados.length);
			dos.write(dadosDecifrados);
		}

		enviarmensagem();

	}*/

	public static class Chat1 {
		private static String op;

		public static void main(String[] args) throws Exception {
			int escolha = 0;

			JOptionPane.showMessageDialog(null,
							  "\n\n\tBem Vindo! \n\n   " 
							+ "\nEsse CHAT vem com as seguintes implementações: "
							+ "\n\n-Apenas um arquivo é utilizado tanto para Cliente quanto para Servidor              "
							+ "\n-Funciona em protocolo UDP" + "\n-Datagram Sockets"
							+ "\n-Criptografia DES/ECB/PKCS5Padding" + "\n-Dialogs com JOption"
							+ "\n\n\nCreditos: Alexandre Paiva e Bruno Manso\n\n\n");

			nome = String.valueOf(JOptionPane.showInputDialog(null, "Digite seu NOME"));
			System.out.println("Nome: " + nome);

			//porta = Integer.parseInt(JOptionPane.showInputDialog(null, "Digite a porta de SAIDA"));
			System.out.println("Porta de Saída: " + porta);

			//portaVizinho = Integer.parseInt(JOptionPane.showInputDialog(null, "Digite a porta de Destino"));
			System.out.println("Porta de Saída: " + portaVizinho);
			opcao();

			while (escolha == 0) {
				String opcao = String.valueOf(JOptionPane.showInputDialog(null,
								  "\n\nDigite 'G' para gerar uma chave de segurança" 
								+ "\nOu Digite 'C' para continuar\n\n"));

				if (opcao.equalsIgnoreCase("G")) {
					gerarChave();

				} else {
					chat1 chat = new chat1();
					Thread t = new Thread(chat);
					t.start();
					chat.enviarmensagem();
				}
			}
		}

		private static void opcao() throws UnknownHostException {
			op = String.valueOf(JOptionPane.showInputDialog(null, 
							  "\n\nSe deseja usar um IP Local digite 'L',          "
							+ "\nSe deseja usar um IP Externo digite 'E'" 
							+ "\nSe deseja usar um outro IP digite 'O'\n\n"));
			
			if (op.equalsIgnoreCase("L")) {
				ipVizinho = "127.0.0.1";
				System.out.println("Conectado a: " + ipVizinho);
			}
			if (op.equalsIgnoreCase("E")) {
			
				String ipExterno = "";
				try {
					URL url_name = new URL("http://bot.whatismyipaddress.com");

					BufferedReader sc = new BufferedReader(new InputStreamReader(url_name.openStream()));

					// reads system IPAddress
					ipExterno = sc.readLine().trim();
				} catch (Exception e) {
					ipExterno = "Não pode ser executado de forma correta!!";
				}
				System.out.println("Conectado a: " + ipExterno);
				ipVizinho = ipExterno;
			}
			if (op.equalsIgnoreCase("O")) {
				ipVizinho = String.valueOf(JOptionPane.showInputDialog(null, "Digite o IP do DESTINO"));
				System.out.println("Conectado a: " + ipVizinho);

			}

		}
	}
}
