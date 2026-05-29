import { useState } from "react";

const presentationSlides = [
  {
    id: "slide-01",
    number: "01",
    title: "Atlas System",
    status: "Согласовано",
    description:
      "Первый слайд открывает презентацию простым объяснением для новичка: Atlas System — это цифровая система взаимопомощи, где люди добровольно объединяют средства, а правила распределения заранее записаны в smart-contract.",
    slideText: [
      "Atlas System",
      "Цифровая система взаимопомощи",
      "Люди добровольно объединяют средства, а правила распределения заранее записаны в smart-contract.",
    ],
    image: "/generated/atlas-presentation-slide-01.png",
  },
];

function PresentationContentTab() {
  const [activeSlideId, setActiveSlideId] = useState(presentationSlides[0]?.id);
  const activeSlide = presentationSlides.find((slide) => slide.id === activeSlideId) || presentationSlides[0];

  return (
    <section className="analytics-surface analytics-content-presentation">
      <div className="analytics-content-presentation-head">
        <div>
          <p className="analytics-kicker">Презентация Atlas System</p>
          <h2 className="analytics-restored-section-title">Согласованные слайды</h2>
          <p className="analytics-restored-section-copy">
            Здесь собираем финальный текст и изображение каждого слайда по мере согласования.
          </p>
        </div>
        <span className="analytics-content-presentation-count">{presentationSlides.length} слайд</span>
      </div>

      <div className="analytics-content-presentation-layout">
        <aside className="analytics-content-presentation-nav" aria-label="Слайды презентации">
          {presentationSlides.map((slide) => (
            <button
              key={slide.id}
              type="button"
              className={`analytics-content-slide-tab${activeSlide.id === slide.id ? " analytics-content-slide-tab-active" : ""}`}
              onClick={() => setActiveSlideId(slide.id)}
            >
              <span>{slide.number}</span>
              <strong>{slide.title}</strong>
              <small>{slide.status}</small>
            </button>
          ))}
        </aside>

        <article className="analytics-content-presentation-detail">
          <div className="analytics-content-presentation-title-row">
            <span>{activeSlide.number}</span>
            <div>
              <h3>{activeSlide.title}</h3>
              <p>{activeSlide.description}</p>
            </div>
          </div>

          <div className="analytics-content-slide-copy">
            <h4>Текст на слайде</h4>
            {activeSlide.slideText.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="analytics-content-slide-preview">
            <img src={activeSlide.image} alt={`Слайд ${activeSlide.number}: ${activeSlide.title}`} />
          </div>
        </article>
      </div>
    </section>
  );
}

export default PresentationContentTab;
