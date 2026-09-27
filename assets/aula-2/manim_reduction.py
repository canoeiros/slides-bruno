from manim import *

class BooleanReduction(Scene):
    def construct(self):
        self.camera.background_color = "#0F172A"

        title = Text("Redução em Álgebra Booleana", font_size=32, color=WHITE, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))

        step1 = MathTex(
            "Y", "=", "B", "A\\bar{C}", "+", "\\bar{B}", "A\\bar{C}", "+", "\\bar{B}C",
            font_size=38
        )
        step1.set_color_by_tex("A\\bar{C}", BLUE)

        step2 = MathTex(
            "Y", "=", "A\\bar{C}", "\\cdot", "(B + \\bar{B})", "+", "B\\bar{C}",
            font_size=38
        )
        step2.set_color_by_tex("(B + \\bar{B})", PURPLE_B)

        step3 = MathTex(
            "Y", "=", "A\\bar{C}", "\\cdot", "1", "+", "B\\bar{C}",
            font_size=38
        )
        step3.set_color_by_tex("1", GREEN)

        step4 = MathTex(
            "Y", "=", "A", "\\bar{C}", "+", "B", "\\bar{C}",
            font_size=38
        )
        step4.set_color_by_tex("\\bar{C}", BLUE)

        step5 = MathTex(
            "Y", "=", "\\bar{C}", "[A + B]",
            font_size=42,
            color=GREEN
        )

        steps = [step1, step2, step3, step4, step5]
        explanations = [
            "1. Identificação do fator comum: A\\bar{C}",
            "2. Fatoração: Colocar A\\bar{C} em evidência",
            "3. Lei do Complemento: B + \\bar{B} = 1",
            "4. Elemento Neutro: A\\bar{C} \\cdot 1 = A\\bar{C}",
            "5. Fatoração final: Colocar \\bar{C} em evidência"
        ]

        current_step = step1
        exp_text = Text(explanations[0], font_size=20, color="#F59E0B")
        exp_text.next_to(current_step, DOWN, buff=0.8)

        self.play(Write(current_step), FadeIn(exp_text))
        self.wait(1.5)

        for i in range(1, len(steps)):
            next_step = steps[i]
            new_exp = Text(explanations[i], font_size=20, color="#F59E0B")
            new_exp.next_to(next_step, DOWN, buff=0.8)

            self.play(
                TransformMatchingTex(current_step, next_step),
                Transform(exp_text, new_exp),
                run_time=1.2
            )
            current_step = next_step
            self.wait(1.5)

        frame = SurroundingRectangle(current_step, color=GREEN, buff=0.2, corner_radius=0.1)
        self.play(Create(frame))
        self.wait(2)
