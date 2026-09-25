package Exemplos;

import java.net.*;
import java.security.*;
import java.io.*;
import javax.crypto.Cipher;

public class clienteseguro {

	    public static void main(String[] args) throws Exception {
	        Socket conexao = new Socket("127.0.0.1", 7777);
	        DataOutputStream saida = new DataOutputStream(conexao.getOutputStream());
	        
	        Key chave;
	        ObjectInputStream in = new ObjectInputStream( new FileInputStream("Chave.key"));
	        chave = (Key)in.readObject();
	        in.close(); 
	        
	        System.out.println("Digite uma mensagem a ser cifrada: ");
	        String mensagem = new java.util.Scanner(System.in).nextLine();
	        
	        byte[] bytesMensagem = mensagem.getBytes("UTF8");
	        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
	        cipher.init(Cipher.ENCRYPT_MODE, chave);
	        
	        byte[] dadosCifrados = cipher.doFinal(bytesMensagem);

	        saida.writeInt(dadosCifrados.length);
	        saida.write(dadosCifrados);
	        
	        saida.close();
	    }
	    
	}
