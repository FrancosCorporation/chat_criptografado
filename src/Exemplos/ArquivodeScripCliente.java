package Exemplos;

import java.net.*;
import java.io.*;

public class ArquivodeScripCliente {

	public static void main(String[] args) throws Exception {
		Socket conexao = new Socket("localhost", 7777);
	
		DataOutputStream saida = new DataOutputStream(conexao.getOutputStream());
		
		FileInputStream fis = new FileInputStream("arq-enviado.txt");
		fis.transferTo(saida);
		saida.flush();
		fis.close();
		conexao.close();

	}

}
