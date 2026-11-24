import type { PlaceBusiness } from "../data/place-media";
import { dateLocales, localText } from "../localization";
import type { DiscoveryLanguage } from "../model";

/** Display the available Google Places details and their source. */
export function PlaceBusinessInfo({
  business,
  language,
}: {
  business: PlaceBusiness;
  language: DiscoveryLanguage;
}) {
  const { rating, ratingCount, phone, website, hours, mapsUrl } = business;
  if (rating === undefined && !phone && !website && !hours?.length) return null;
  const t = (en: string, ko: string) => localText(language, en, ko);
  const number = new Intl.NumberFormat(dateLocales[language]);

  return (
    <section className="local-detail-section">
      <h2>{t("Business info", "가게 정보")}</h2>
      <dl className="local-business-info">
        {rating !== undefined && (
          <div>
            <dt>{t("Rating", "평점")}</dt>
            <dd>
              {number.format(rating)} / 5
              {ratingCount !== undefined && ` (${number.format(ratingCount)})`}
            </dd>
          </div>
        )}
        {phone && (
          <div>
            <dt>{t("Phone", "전화")}</dt>
            <dd>
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>
            </dd>
          </div>
        )}
        {website && (
          <div>
            <dt>{t("Website", "웹사이트")}</dt>
            <dd>
              <a href={website} target="_blank" rel="noreferrer">
                {new URL(website).hostname} ↗
              </a>
            </dd>
          </div>
        )}
      </dl>
      {hours && hours.length > 0 && (
        <details className="local-business-hours">
          <summary>{t("Opening hours", "영업시간")}</summary>
          <ul>
            {hours.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      <small className="local-place-source">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer">
            Google Maps ↗
          </a>
        ) : (
          "Google Maps"
        )}
      </small>
    </section>
  );
}
