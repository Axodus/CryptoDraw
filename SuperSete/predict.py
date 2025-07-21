import pandas as pd
import numpy as np
import os

def gerar_palpite_simples(df):
    palpites = []
    for col in df.columns[1:]:
        freq = df[col].value_counts().sort_values(ascending=False)
        if not freq.empty:
            palpites.append(freq.index[0])
        else:
            palpites.append(-1)
    return palpites

def gerar_palpite_markov(df):
    palpites = []
    for col in df.columns[1:]:
        series = pd.to_numeric(df[col], errors='coerce').dropna().astype(int)
        series = [s for s in series if 0 <= s <= 9]
        if len(series) < 2:
            palpites.append(-1)
            continue
        mat = np.ones((10, 10))
        for i in range(len(series) - 1):
            mat[series[i]][series[i + 1]] += 1
        transition = (mat.T / mat.sum(axis=1)).T
        last = series[-1]
        palpites.append(int(np.argmax(transition[last])))
    return palpites

def gerar_palpites_beam(df, beam_width=3):
    if len(df) < 5:
        return [[-1]*7]
    recent = df.tail(20)
    freq_df = {
        col: recent[col].value_counts(normalize=True).sort_index()
        for col in df.columns[1:]
    }
    sorted_digits = {
        col: freq_df[col].sort_values(ascending=False).index.tolist()
        for col in freq_df
    }
    beam = [[d] for d in sorted_digits[df.columns[1]][:beam_width]]
    for col in df.columns[2:]:
        new_beam = []
        for path in beam:
            for d in sorted_digits[col][:beam_width]:
                new_path = path + [d]
                prob = np.prod([
                    freq_df[c][val] if val in freq_df[c] else 0.01
                    for c, val in zip(df.columns[1:], new_path)
                ])
                new_beam.append((new_path, prob))
        new_beam = sorted(new_beam, key=lambda x: x[1], reverse=True)[:beam_width]
        beam = [b for b, _ in new_beam]
    return beam

def salvar_relatorio(p1, p2, p3, path="SuperSete/index.html"):
    with open(path, "w") as f:
        f.write("<html><head><meta charset='UTF-8'><title>Palpite Super Sete</title></head><body>")
        f.write("<h1>Palpite Automático Super Sete</h1>")

        f.write("<h2>🎯 Palpite Simples (Frequência Histórica)</h2>")
        f.write(f"<p>{p1}</p>")

        f.write("<h2>🔁 Palpite Markov 1ª Ordem</h2>")
        f.write(f"<p>{p2}</p>")

        f.write("<h2>🤖 Top Palpites por Beam Search (base 20 concursos)</h2>")
        for i, beam in enumerate(p3):
            f.write(f"<p>{i+1}. {beam}</p>")

        f.write("</body></html>")

if __name__ == "__main__":
    path = "SuperSete/data/SuperSete.csv"
    if not os.path.exists(path):
        print("Arquivo de dados não encontrado.")
        exit(1)

    df = pd.read_csv(path)

    if list(df.columns) == [f"Coluna {i}" for i in range(1, 8)]:
        df.columns = ["col_a", "col_b", "col_c", "col_d", "col_e", "col_f", "col_g"]
        df.insert(0, "contest", range(1, len(df)+1))

    if df.empty or len(df.columns) < 8:
        print("Dados insuficientes para gerar palpites.")
        salvar_relatorio([], [], [])
        exit(0)

    palpite_simples = gerar_palpite_simples(df)
    palpite_markov = gerar_palpite_markov(df)
    palpites_beam = gerar_palpites_beam(df)

    salvar_relatorio(palpite_simples, palpite_markov, palpites_beam)
