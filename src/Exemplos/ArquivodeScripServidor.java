package Exemplos;
import java.net.*;
import java.io.*;

public class ArquivodeScripServidor {

	public static void main(String[] args) throws Exception {
			ServerSocket servidor = new ServerSocket(7777);
			System.out.println("esperando conexao");
			Socket conexao = servidor.accept();
			System.out.println("conexao estabelecida. ");
			
			DataInputStream entrada = new DataInputStream(conexao.getInputStream());
			FileOutputStream fos = new FileOutputStream("arq-recebido.txt");
			
			entrada.transferTo(fos);
			fos.close();
			System.out.println("dados enviados");
			}
}
