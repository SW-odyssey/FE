import type { Attribution, GooglePlaceDisplay, ReviewLanguage } from "./types";
import { copy } from "./copy";

function Credit({ authors }: { authors: Attribution[] }) {
  return (
    <>
      {authors.map((author, i) => (
        <span key={i}>
          {i > 0 ? " · " : ""}
          {author.uri ? (
            <a href={author.uri} target="_blank" rel="noreferrer">
              {author.name}
            </a>
          ) : (
            author.name
          )}
        </span>
      ))}
    </>
  );
}

/** Google content remains visibly separate from our recommendation and population copy. */
export function GoogleDetails({
  data,
  language,
}: {
  data: GooglePlaceDisplay;
  language: ReviewLanguage;
}) {
  const t = copy[language];
  return (
    <section className="review-google-content" aria-label={t.google}>
      <div className="review-section-line">
        <h2>{t.google}</h2>
        <span className="review-google-attribution" translate="no">
          Google Maps
        </span>
      </div>
      {data.photo && (
        <figure className="review-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- Ephemeral provider URL, deliberately outside Next image caching. */}
          <img src={data.photo.url} alt={data.name} />
          <figcaption>
            <Credit authors={data.photo.authors} /> ·{" "}
            <a
              href={data.photo.mapsUri ?? data.mapsUri}
              target="_blank"
              rel="noreferrer"
            >
              {t.original}
            </a>
            {data.photo.flagContentUri && (
              <>
                {" "}
                ·{" "}
                <a
                  href={data.photo.flagContentUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.report}
                </a>
              </>
            )}
          </figcaption>
        </figure>
      )}
      <h3>{data.name}</h3>
      <p>{data.editorialSummary ?? t.noSummary}</p>
      <dl className="review-details">
        {data.rating !== undefined && (
          <>
            <dt>Google Maps</dt>
            <dd>
              {data.rating.toFixed(1)} / 5{" "}
              {data.ratingCount !== undefined &&
                `(${data.ratingCount.toLocaleString()})`}
            </dd>
          </>
        )}
        {data.address && (
          <>
            <dt>
              {language === "ko"
                ? "주소"
                : language === "ja"
                  ? "住所"
                  : "Address"}
            </dt>
            <dd>{data.address}</dd>
          </>
        )}
        {data.phone && (
          <>
            <dt>{t.phone}</dt>
            <dd>
              <a href={`tel:${data.phone.replace(/[^+0-9]/g, "")}`}>
                {data.phone}
              </a>
            </dd>
          </>
        )}
        {data.website && (
          <>
            <dt>{t.website}</dt>
            <dd>
              <a href={data.website} target="_blank" rel="noreferrer">
                {new URL(data.website).hostname}
              </a>
            </dd>
          </>
        )}
      </dl>
      {data.openingHours.length > 0 && (
        <details>
          <summary>{t.hours}</summary>
          <ul>
            {data.openingHours.map((day) => (
              <li key={day}>{day}</li>
            ))}
          </ul>
        </details>
      )}
      <p>
        <a href={data.mapsUri} target="_blank" rel="noreferrer">
          {t.onMaps} ↗
        </a>
      </p>
      {data.attributions.length > 0 && (
        <p className="review-credit">
          <Credit authors={data.attributions} />
        </p>
      )}
      {data.reviews.length > 0 && (
        <div className="review-provider-reviews">
          <h3>{t.reviews}</h3>
          {data.reviews.map((review, i) => (
            <article key={i}>
              <div className="review-section-line">
                <b>
                  <Credit authors={[review.author]} />
                </b>
                {review.rating !== undefined && (
                  <span>{review.rating} / 5</span>
                )}
              </div>
              <p>{review.text}</p>
              {review.originalLanguage &&
                review.language &&
                review.originalLanguage !== review.language && (
                  <>
                    <small>{t.translated}</small>
                    <details>
                      <summary>{t.original}</summary>
                      <p>{review.originalText}</p>
                    </details>
                  </>
                )}
              <p className="review-credit">
                <a
                  href={review.mapsUri ?? data.mapsUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.original} ↗
                </a>
                {review.flagContentUri && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={review.flagContentUri}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.report}
                    </a>
                  </>
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
