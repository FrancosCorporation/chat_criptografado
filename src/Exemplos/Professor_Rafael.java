package Exemplos;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

public class Professor_Rafael {

	public static void main(String[] args) throws Exception{
		int porta = 8888;
		DatagramSocket socket = new DatagramSocket(porta);
		String mensagem = "Oi Vizinho";
		byte[] dados = mensagem.getBytes();
		String ipvizinho= "127.0.0.1";
		int portavizinho=9999;
		DatagramPacket pacote = new DatagramPacket(dados,dados.length, InetAddress.getByName(ipvizinho), portavizinho);

	}

}
